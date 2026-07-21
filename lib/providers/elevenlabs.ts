import "server-only";
import { ApiError } from "@/lib/security/api";
import { normalizeElevenLabsPayload } from "@/lib/workflows/elevenlabs";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { persistSafetyClassification } from "@/lib/workflows/safety-persistence";

const BASE = "https://api.elevenlabs.io/v1/convai/conversations";
type Fetcher = typeof fetch;

async function request(path: string, fetcher: Fetcher) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new ApiError("missing_configuration", "ELEVENLABS_API_KEY is not configured.");
  for(let attempt=0;attempt<4;attempt++){
    const response = await fetcher(`${BASE}${path}`, { headers: { "xi-api-key": key }, cache: "no-store" });
    if(response.ok)return response;
    if(response.status!==429&&response.status<500)throw new ApiError("provider_failure",`ElevenLabs request failed (${response.status}).`);
    if(attempt<3)await new Promise(resolve=>setTimeout(resolve,Math.min(4000,250*2**attempt)));
  }
  throw new ApiError("provider_failure","ElevenLabs request failed after retries.");
}

export async function syncElevenLabs(fetcher: Fetcher = fetch) {
  const db = createServiceSupabaseClient();
  const globalOwner = "00000000-0000-0000-0000-000000000000";
  const checkpointResult = await db.from("sync_checkpoints").select("cursor").eq("provider", "elevenlabs").eq("owner_id", globalOwner).eq("stream", "conversations").maybeSingle();
  let cursor = checkpointResult.data?.cursor || null;
  let imported = 0, pages = 0;
  do {
    const query = new URLSearchParams({ page_size: "100", summary_mode: "include" });
    if (process.env.ELEVENLABS_AGENT_ID) query.set("agent_id", process.env.ELEVENLABS_AGENT_ID);
    if (cursor) query.set("cursor", cursor);
    const list = await (await request(`?${query}`, fetcher)).json() as { conversations?: Array<Record<string, unknown>>; has_more?: boolean; next_cursor?: string | null };
    pages++;
    for (const summary of list.conversations || []) {
      const id = typeof summary.conversation_id === "string" ? summary.conversation_id : null;
      if (!id) continue;
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
      if(typeof ticketId==="string"){if(normalized.twilioCallSid)await db.from("maintenance_tickets").update({twilio_call_sid:normalized.twilioCallSid,secondary_provider_ids:{elevenlabs:normalized.conversationId,twilio:normalized.twilioCallSid},provider_metadata:{twilio_call_sid:normalized.twilioCallSid}}).eq("id",ticketId);await persistSafetyClassification(ticketId,`${normalized.summary}\n${normalized.transcript}`)}
      imported++;
    }
    cursor = list.next_cursor || null;
    await db.from("sync_checkpoints").upsert({ provider: "elevenlabs", owner_id: globalOwner, stream: "conversations", cursor, last_success_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }, { onConflict: "provider,owner_id,stream" });
    if (!list.has_more) break;
  } while (cursor && pages < 100);
  return { imported, pages, cursor, complete: !cursor };
}

export async function elevenLabsAudio(conversationId: string, fetcher: Fetcher = fetch) {
  return request(`/${encodeURIComponent(conversationId)}/audio`, fetcher);
}
