export const runtime = "nodejs";

import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { getElevenLabsSignature, verifyElevenLabsSignature } from "@/lib/security/webhooks";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

type ElevenLabsTranscriptItem = {
  role?: string;
  message?: string;
  text?: string;
  time_in_call_secs?: number;
};

function readPath(source: unknown, path: string[]) {
  let current = source;
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function firstString(source: unknown, paths: string[][]) {
  for (const path of paths) {
    const value = readPath(source, path);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstNumber(source: unknown, paths: string[][]) {
  for (const path of paths) {
    const value = readPath(source, path);
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function unixSecondsToIso(value: number | null) {
  if (value === null || value < 946684800 || value > 4102444800) return null;
  return new Date(value * 1000).toISOString();
}

function deriveCallEndedAt(startUnixSecs: number | null, durationSecs: number | null) {
  if (startUnixSecs === null || durationSecs === null) return null;
  if (durationSecs < 0 || durationSecs > 24 * 60 * 60) return null;
  return unixSecondsToIso(startUnixSecs + durationSecs);
}

function transcriptToText(transcript: unknown) {
  if (typeof transcript === "string") return transcript;
  if (!Array.isArray(transcript)) return "";

  return transcript
    .map((item: ElevenLabsTranscriptItem) => {
      const text = item.message || item.text;
      if (!text) return null;
      return item.role ? `${item.role}: ${text}` : text;
    })
    .filter(Boolean)
    .join("\n");
}

export function normalizePayload(payload: Record<string, unknown>) {
  const data =
    (payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : payload) || payload;

  const analysis = readPath(data, ["analysis"]) || readPath(data, ["conversation_analysis"]) || {};
  const collection =
    readPath(analysis, ["data_collection_results"]) ||
    readPath(analysis, ["data_collection"]) ||
    readPath(data, ["data_collection_results"]) ||
    {};

  const transcript = transcriptToText(readPath(data, ["transcript"]));
  const conversationId = firstString(data, [["conversation_id"], ["id"]]);
  const startUnixSecs = firstNumber(data, [["metadata", "start_time_unix_secs"]]);
  const durationSecs = firstNumber(data, [["metadata", "call_duration_secs"]]);

  return {
    eventType: firstString(payload, [["type"], ["event"], ["event_type"]]) || "post_call_transcription",
    conversationId,
    agentId: firstString(data, [["agent_id"], ["agent", "id"]]),
    callerPhone: firstString(data, [
      ["metadata", "phone_call", "external_number"],
      ["metadata", "phone_call", "caller_number"],
      ["caller_phone"],
      ["caller_number"],
      ["from"],
    ]),
    transcript,
    summary:
      firstString(analysis, [["transcript_summary"], ["call_summary"], ["summary"]]) ||
      transcript.slice(0, 500),
    residentName:
      firstString(collection, [["resident_name", "value"], ["tenant_name", "value"], ["name", "value"]]) ||
      "Caller",
    property:
      firstString(collection, [["property", "value"], ["address", "value"], ["property_address", "value"]]) ||
      "Unassigned",
    unit: firstString(collection, [["unit", "value"], ["unit_number", "value"]]),
    category:
      firstString(collection, [["issue_category", "value"], ["category", "value"]]) ||
      "General Maintenance",
    issue:
      firstString(collection, [["issue_details", "value"], ["issue", "value"], ["maintenance_issue", "value"]]) ||
      firstString(analysis, [["transcript_summary"], ["summary"]]) ||
      "Maintenance intake from ElevenLabs call",
    urgency:
      firstString(collection, [["urgency", "value"], ["priority", "value"]]) ||
      firstString(analysis, [["urgency"], ["priority"]]) ||
      "Medium",
    permissionToEnter: firstString(collection, [
      ["permission_to_enter", "value"],
      ["entry_permission", "value"],
    ]),
    callStartedAt:
      unixSecondsToIso(startUnixSecs) ||
      firstString(data, [["metadata", "start_time"], ["start_time"], ["call_started_at"]]) || null,
    callEndedAt:
      deriveCallEndedAt(startUnixSecs, durationSecs) ||
      firstString(data, [["metadata", "end_time"], ["end_time"], ["call_ended_at"]]) || null,
    callStatus: firstString(data, [["status"], ["call_status"]]) || "completed",
  };
}

// Configure the ElevenLabs dashboard post-call webhook URL as:
// https://legacynashvilleos.space/api/elevenlabs
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signatureResult = verifyElevenLabsSignature({
      rawBody,
      signatureHeader: getElevenLabsSignature(req.headers),
      secret: process.env.ELEVENLABS_WEBHOOK_SECRET,
    });

    if (!signatureResult.ok) {
      throw new ApiError("unauthorized", "Invalid ElevenLabs webhook signature.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      throw new ApiError("bad_request", "Malformed JSON payload.");
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new ApiError("bad_request", "Malformed webhook payload.");
    }

    const normalized = normalizePayload(parsed as Record<string, unknown>);
    if (normalized.eventType !== "post_call_transcription") {
      throw new ApiError("bad_request", "Unsupported ElevenLabs event type.");
    }

    if (!normalized.conversationId) {
      throw new ApiError("bad_request", "Missing conversation ID.");
    }

    if (process.env.ELEVENLABS_AGENT_ID && normalized.agentId !== process.env.ELEVENLABS_AGENT_ID) {
      throw new ApiError("unauthorized", "Unexpected ElevenLabs agent.");
    }

    const supabase = createServiceSupabaseClient();
    const { data: ticketId, error: intakeError } = await supabase.rpc("create_or_repair_elevenlabs_intake", {
      payload: {
        conversation_id: normalized.conversationId,
        agent_id: normalized.agentId,
        caller_phone: normalized.callerPhone,
        transcript: normalized.transcript,
        summary: normalized.summary,
        resident_name: normalized.residentName,
        property: normalized.property,
        unit: normalized.unit,
        category: normalized.category,
        issue: normalized.issue,
        urgency: normalized.urgency,
        permission_to_enter: normalized.permissionToEnter,
        call_started_at: normalized.callStartedAt,
        call_ended_at: normalized.callEndedAt,
        call_status: normalized.callStatus,
        event_type: normalized.eventType,
      },
    });

    if (intakeError) throw new ApiError("server_error", intakeError.message);
    return apiJson({ success: true, ticketId });
  } catch (error) {
    return apiError(error);
  }
}
