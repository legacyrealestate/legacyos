import twilio from "twilio";

export function getCanonicalAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;

  try {
    const parsed = new URL(appUrl);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function getTwilioStatusCallbackUrl() {
  const origin = getCanonicalAppUrl();
  return origin ? `${origin}/api/twilio/status` : null;
}

export function validateTwilioStatusCallbackSignature({
  authToken,
  signature,
  params,
}: {
  authToken: string;
  signature: string;
  params: Record<string, string>;
}) {
  const callbackUrl = getTwilioStatusCallbackUrl();
  if (!callbackUrl) return false;
  return twilio.validateRequest(authToken, signature, callbackUrl, params);
}
