import { ApiError } from "@/lib/security/api";
import { randomUUID } from "node:crypto";

type ResendReceivedEmail = {
  id?: string;
  from?: string;
  to?: string[];
  cc?: string[];
  subject?: string;
  text?: string;
  html?: string;
  created_at?: string;
};

function resendKey() {
  const value = process.env.RESEND_API_KEY?.trim();
  if (!value) throw new ApiError("server_error", "RESEND_API_KEY is not configured.");
  return value;
}

export async function fetchReceivedEmail(emailId: string): Promise<ResendReceivedEmail> {
  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${resendKey()}` },
    cache: "no-store",
  });
  const data = (await response.json()) as ResendReceivedEmail & { message?: string };
  if (!response.ok) {
    throw new ApiError("server_error", data.message || "Unable to retrieve the inbound email.");
  }
  return data;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string | null;
}) {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) throw new ApiError("server_error", "EMAIL_FROM is not configured.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey()}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `legacyos-${randomUUID()}`,
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
  });
  const data = (await response.json()) as { id?: string; message?: string };
  if (!response.ok || !data.id) {
    throw new ApiError("server_error", data.message || "Email provider rejected the message.");
  }
  return data;
}
