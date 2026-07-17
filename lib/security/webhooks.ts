import crypto from "node:crypto";

export function timingSafeEqualHex(a: string, b: string) {
  const aBuffer = Buffer.from(a, "hex");
  const bBuffer = Buffer.from(b, "hex");
  return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer);
}

export function verifyElevenLabsSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string | undefined;
  toleranceSeconds?: number;
  nowMs?: number;
}) {
  const { rawBody, signatureHeader, secret, toleranceSeconds = 300, nowMs = Date.now() } = params;

  if (!secret) return { ok: false, reason: "missing_secret" };
  if (!signatureHeader) return { ok: false, reason: "missing_signature" };

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.trim().split("=");
      return [key, value];
    })
  );

  const timestamp = parts.t || parts.timestamp;
  const signature = parts.v0 || parts.v1 || parts.signature || parts.hmac;

  if (!timestamp || !signature || !/^[a-f0-9]{64}$/i.test(signature)) {
    return { ok: false, reason: "malformed_signature" };
  }

  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs)) {
    return { ok: false, reason: "malformed_timestamp" };
  }

  if (Math.abs(nowMs - timestampMs) > toleranceSeconds * 1000) {
    return { ok: false, reason: "stale_signature" };
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return timingSafeEqualHex(expected, signature)
    ? { ok: true as const }
    : { ok: false as const, reason: "invalid_signature" };
}

export function getElevenLabsSignature(headers: Headers) {
  return (
    headers.get("elevenlabs-signature") ||
    headers.get("x-elevenlabs-signature") ||
    headers.get("svix-signature")
  );
}
