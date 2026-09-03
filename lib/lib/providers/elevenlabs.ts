import "server-only";
import { ApiError } from "@/lib/security/api";
import { normalizeElevenLabsPayload } from "@/lib/workflows/elevenlabs";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { persistSafetyClassification } from "@/lib/workflows/safety-persistence";
import { enqueueAlma } from "@/lib/workflows/alma";
import { routeTicketToVendor } from "@/lib/workflows/vendor-routing";

const BASE = "https://api.elevenlabs.io/v1/convai/conversations";
type Fetcher = typeof fetch;

async function request(path: string, fetcher: Fetcher) {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) throw new ApiError("missing_configuration", "ELEVENLABS_API_KEY is not configured.");
  for(let attempt=0;attempt<4;attempt++){
    const response = await fetcher(`${BASE}${path}`, { headers: { "xi-api-key": key }, cache: "no-store" });
    if(response.ok)return response;
    if(response.status!==429&&response.status<500){
      const raw = (await response.text()).slice(0, 500);
      let detail = "";
      try { const parsed = JSON.parse(raw) as { detail?: unknown; message?: unknown }; detail = typeof parsed.detail === "string" ? parsed.detail : typeof parsed.message === "string" ? parsed.message : ""; } catch { detail = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }
      throw new ApiError("provider_failure", `ElevenLabs rejected the sync request (${response.status})${detail ? `: ${detail}` : "."}`);
    }
    if(attempt<3)await new Promise(resolve=>setTimeout(resolve,Math.min(4000,250*2**attempt)));
  }
  throw new ApiError("provider_failure","ElevenLabs request failed after retries.");
}

export async function syncElevenLabs(fetcher: Fetcher = fetch) {
  const agentId = process.env.ELEVENLABS_AGENT_ID?.trim();
  if (!agentId) throw new ApiError("missing_configuration", "ELEVENLABS_AGENT_ID is not configured.");
  if (!/^(agent_|seng_)/.test(agentId)) throw new ApiError("missing_configuration", "ELEVENLABS_AGENT_ID must start with agent_ or seng_.");
  const db = createServiceSupabaseClient();
  const globalOwner = "00000000-0000-0000-0000-000000000000";
  const checkpointResult = await db.from("sync_checkpoints").select("cursor,checkpoint").eq("provider", "elevenlabs").eq("owner_id", globalOwner).eq("stream", "conversations").maybeSingle();
  let cursor = checkpointResult.data?.cursor || null;
  const previous = checkpointResult.data?.checkpoint as Record<string, unknown> | null;
  const startAfter = typeof previous?.latestStartUnix === "number" ? previous.latestStartUnix : null;
  let latestStartUnix = startAfter || 0;
  let imported = 0, pages = 0;
  const seenCursors = new Set<string>();
  do {
    const query = new URLSearchParams({ page_size: "100", summary_mode: "include" });
    query.set("agent_id", agentId);
    if (!cursor && startAfter) query.set("call_start_after_unix", String(Math.max(0, startAfter - 1)));
    if (cursor) query.set("cursor", cursor);
    const list = await (await request(`?${query}`, fetcher)).json() as { conversations?: Array<Record<string, unknown>>; has_more?: boolean; next_cursor?: string | null };
    pages++;
    for (const summary of list.conversations || []) {
      const id = typeof summary.conversation_id === "string" ? summary.conversation_id : null;
      if (!id) continue;
      const startUnix = typeof summary.start_time_unix_secs === "number" ? summary.start_time_unix_secs : 0;
      latestStartUnix = Math.max(latestStartUnix, startUnix);
      const detail = await (await request(`/${encodeURIComponent(id)}`, fetcher)).json() as Record<string, unknown>;
      const normalized = normalizeElevenLabsPayload(detail);
      const { data: ticketId, error } = await db.rpc("create_or_repair_elevenlabs_intake", { payload: {
        conversation_id: normalized.conversationId || id, agent_id: normalized.agentId, caller_phone: normalized.callerPhone,
        transcript: normalized.transcript, summary: normalized.summary, resident_name: normalized.residentName,
        property: normalized.property, unit: normalized.unit, category: normalized.category, issue: normalized.issue,
        urgency: normalized.urgency, permission_to_enter: normalized.permissionToEnter, call_started_at: normalized.callStartedAt,
        call_ended_at: normalized.callEndedAt, call_status: normalized.callStatus, event_type: "historical_sync",
        direction: summary.direction, sentiment: (summary.sentiment_analysis as Record<string, unknown> | undefined)?.overall_label,
        recording_available: detail.has_audio === true, provider_metadata: { twilio_call_sid: normalized.twilioCallSid }
      }});
      if (error) throw new ApiError("server_error", "Unable to persist synchronized conversation.");
      if(typeof ticketId==="string"){await db.from("maintenance_tickets").update({transcript_turns:normalized.transcriptTurns,call_outcome:normalized.callStatus,failure_reason:normalized.failureReason,recording_available:normalized.recordingAvailable,follow_up_status:normalized.callStatus==="failed"?"queued":"none",...(normalized.twilioCallSid?{twilio_call_sid:normalized.twilioCallSid,secondary_provider_ids:{elevenlabs:normalized.conversationId,twilio:normalized.twilioCallSid},provider_metadata:{twilio_call_sid:normalized.twilioCallSid}}:{})}).eq("id",ticketId);await persistSafetyClassification(ticketId,`${normalized.summary}\n${normalized.transcript}`);await routeTicketToVendor(ticketId,"elevenlabs_sync");await enqueueAlma({jobType:"call_analysis",entityType:"maintenance_ticket",entityId:ticketId,payload:{text:normalized.summary,action:"analyze"},idempotencyKey:`call-analysis:${normalized.conversationId||id}`});if(normalized.callStatus==="failed")await enqueueAlma({jobType:"call_follow_up",entityType:"maintenance_ticket",entityId:ticketId,payload:{reason:normalized.failureReason||"ElevenLabs call failed"},idempotencyKey:`call-follow-up:${normalized.conversationId||id}`})}
      imported++;
    }
    const nextCursor = list.next_cursor || null;
    if (nextCursor && seenCursors.has(nextCursor)) throw new ApiError("provider_failure", "ElevenLabs returned a repeated pagination cursor.");
    if (nextCursor) seenCursors.add(nextCursor);
    cursor = nextCursor;
    await db.from("sync_checkpoints").upsert({ provider: "elevenlabs", owner_id: globalOwner, stream: "conversations", cursor, checkpoint:{latestStartUnix,importedInLastRun:imported,pagesInLastRun:pages}, last_success_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }, { onConflict: "provider,owner_id,stream" });
    if (!list.has_more) break;
  } while (cursor);
  return { imported, pages, cursor, complete: !cursor };
}

export async function elevenLabsAudio(conversationId: string, fetcher: Fetcher = fetch) {
  return request(`/${encodeURIComponent(conversationId)}/audio`, fetcher);
}
