import crypto from "node:crypto";

function safeEqualBase64(a: string, b: string) {
  try {
    const aBuffer = Buffer.from(a, "base64");
    const bBuffer = Buffer.from(b, "base64");
    return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer);
  } catch {
    return false;
  }
}

export function verifyResendWebhook(params: {
  rawBody: string;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  secret: string | undefined;
  toleranceSeconds?: number;
  nowMs?: number;
}) {
  const {
    rawBody,
    id,
    timestamp,
    signature,
    secret,
    toleranceSeconds = 300,
    nowMs = Date.now(),
  } = params;
  if (!secret || !id || !timestamp || !signature) return false;

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) return false;
  if (Math.abs(nowMs - timestampNumber * 1000) > toleranceSeconds * 1000) return false;

  const secretValue = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let key: Buffer;
  try {
    key = Buffer.from(secretValue, "base64");
  } catch {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");
  const candidates = signature
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item.includes(",") ? item.split(",").at(-1) || "" : item));

  return candidates.some((candidate) => safeEqualBase64(expected, candidate));
}
