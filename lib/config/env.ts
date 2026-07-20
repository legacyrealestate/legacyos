export type IntegrationState = {
  id: "supabase" | "openai" | "twilio" | "elevenlabs" | "email";
  label: string;
  configured: boolean;
  missing: string[];
  detail: string;
};

function present(name: string) {
  return Boolean(process.env[name]?.trim());
}

function state(
  id: IntegrationState["id"],
  label: string,
  variables: string[],
  detail: string
): IntegrationState {
  const missing = variables.filter((name) => !present(name));
  return { id, label, configured: missing.length === 0, missing, detail };
}

export function getIntegrationStates(): IntegrationState[] {
  return [
    state(
      "supabase",
      "Supabase",
      ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
      "Authentication, CRM, calls, tickets, email records, and realtime data"
    ),
    state(
      "openai",
      "OpenAI / ALMA",
      ["OPENAI_API_KEY"],
      "ALMA operations chat, call insights, and email drafting"
    ),
    state(
      "twilio",
      "Twilio",
      ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER", "NEXT_PUBLIC_APP_URL"],
      "SMS delivery and signed provider status callbacks"
    ),
    state(
      "elevenlabs",
      "ElevenLabs",
      ["ELEVENLABS_WEBHOOK_SECRET", "ELEVENLABS_AGENT_ID"],
      "Signed AI phone-call transcripts and structured intake"
    ),
    state(
      "email",
      "Resend Email",
      ["RESEND_API_KEY", "RESEND_WEBHOOK_SECRET", "EMAIL_FROM"],
      "Inbound email, ALMA reply drafts, and approved or policy-safe replies"
    ),
  ];
}

export function autonomyMode() {
  const value = process.env.AUTONOMY_MODE;
  return value === "autopilot" || value === "draft" ? value : "assist";
}

export function emailAutoreplyMode() {
  const value = process.env.EMAIL_AUTOREPLY_MODE;
  return value === "send" || value === "draft" ? value : "off";
}

export function openAIModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
}
