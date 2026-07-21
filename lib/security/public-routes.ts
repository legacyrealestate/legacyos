export const PUBLIC_API_ROUTES = new Set([
  "/api/email/webhook",
  "/api/elevenlabs",
  "/api/twilio/status",
  "/api/twilio/voice/inbound",
  "/api/twilio/voice/outbound",
  "/api/twilio/voice/call-status",
  "/api/twilio/voice/recording",
  "/api/twilio/voice/transcription",
]);

export const PUBLIC_PAGE_ROUTES = new Set([
  "/auth/callback",
  "/login",
  "/privacy-policy",
  "/terms-and-conditions",
]);
