export const runtime = "nodejs";

import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { getTwilioStatusCallbackUrl, validateTwilioStatusCallbackSignature } from "@/lib/communications/twilio";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) throw new ApiError("server_error", "Twilio auth token is not configured.");
    const callbackUrl = getTwilioStatusCallbackUrl();
    if (!callbackUrl) throw new ApiError("server_error", "NEXT_PUBLIC_APP_URL is required for Twilio callbacks.");

    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);
    const signature = req.headers.get("x-twilio-signature") || "";
    const paramObject = Object.fromEntries(params);
    const valid = validateTwilioStatusCallbackSignature({
      authToken,
      signature,
      params: paramObject,
    });

    if (!valid) throw new ApiError("unauthorized", "Invalid Twilio signature.");

    const supabase = createServiceSupabaseClient();
    const messageSid = params.get("MessageSid");
    const messageStatus = params.get("MessageStatus");
    if (messageSid && messageStatus) {
      const { data, error } = await supabase.rpc("apply_twilio_vendor_callback", {
        message_sid_input: messageSid,
        provider_status_input: messageStatus,
      });

      if (error) throw new ApiError("server_error", error.message);
      return apiJson({ success: true, type: "message", result: data, callbackUrl });
    }

    const callSid = params.get("CallSid");
    const callStatus = params.get("CallStatus");
    if (!callSid || !callStatus) {
      throw new ApiError("bad_request", "Missing Twilio message or call status.");
    }
    const now = new Date().toISOString();
    const { data: existingCall, error: lookupError } = await supabase
      .from("call_records")
      .select("id")
      .eq("transport_call_id", callSid)
      .maybeSingle();
    if (lookupError) throw new ApiError("server_error", lookupError.message);
    const callPayload = {
      status: callStatus,
      from_phone: params.get("From"),
      to_phone: params.get("To"),
      direction: params.get("Direction") === "outbound-api" ? "outbound" : "inbound",
      ended_at: ["completed", "busy", "failed", "no-answer", "canceled"].includes(callStatus) ? now : null,
      updated_at: now,
    };
    const result = existingCall?.id
      ? await supabase.from("call_records").update(callPayload).eq("id", existingCall.id).select("id").single()
      : await supabase
          .from("call_records")
          .insert({
            provider: "twilio",
            provider_call_id: callSid,
            transport_call_id: callSid,
            category: "Unclassified",
            urgency: "Medium",
            emergency: false,
            started_at: now,
            ...callPayload,
          })
          .select("id")
          .single();

    if (result.error) throw new ApiError("server_error", result.error.message);
    return apiJson({ success: true, type: "call", callRecordId: result.data.id, callbackUrl });
  } catch (error) {
    return apiError(error);
  }
}
