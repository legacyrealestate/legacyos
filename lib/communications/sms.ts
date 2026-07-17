import twilio from "twilio";
import { ApiError } from "../security/errors.ts";
import { assertE164, assertString } from "../security/validation.ts";

const MESSAGE_TYPES = ["vendor_notification", "resident_confirmation", "status_update"] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];

export function assertMessageType(value: unknown): MessageType {
  if (typeof value !== "string" || !MESSAGE_TYPES.includes(value as MessageType)) {
    throw new ApiError("bad_request", "Invalid message type.");
  }
  return value as MessageType;
}

export function outboundEnabled() {
  return process.env.ENABLE_OUTBOUND_COMMUNICATIONS === "true";
}

export async function sendSMS({
  to,
  body,
  type,
  statusCallbackUrl,
}: {
  to: string;
  body: string;
  type: MessageType;
  statusCallbackUrl?: string | null;
}) {
  const cleanTo = assertE164(to, "recipient phone");
  const cleanBody = assertString(body, "message", 1200);
  assertMessageType(type);

  if (!outboundEnabled()) {
    return {
      skipped: true,
      preview: true,
      reason: "ENABLE_OUTBOUND_COMMUNICATIONS is not true; no SMS was sent.",
      to: cleanTo,
      body: cleanBody,
      type,
    };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new ApiError("server_error", "Twilio is not configured.");
  }

  if (!statusCallbackUrl) {
    throw new ApiError("server_error", "Twilio status callback URL is not configured.");
  }

  const client = twilio(accountSid, authToken);
  const message = await client.messages.create({
    from,
    to: cleanTo,
    body: cleanBody,
    statusCallback: statusCallbackUrl || undefined,
  });

  return {
    skipped: false,
    preview: false,
    sid: message.sid,
    status: message.status,
    type,
  };
}
