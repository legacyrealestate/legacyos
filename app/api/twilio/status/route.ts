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

    const messageSid = params.get("MessageSid");
    const messageStatus = params.get("MessageStatus");
    if (!messageSid || !messageStatus) {
      throw new ApiError("bad_request", "Missing Twilio message status.");
    }

    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.rpc("apply_twilio_vendor_callback", {
      message_sid_input: messageSid,
      provider_status_input: messageStatus,
    });

    if (error) throw new ApiError("server_error", error.message);
    return apiJson({ success: true, result: data, callbackUrl });
  } catch (error) {
    return apiError(error);
  }
}
