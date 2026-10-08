export type IntegrationState = {
  id: "supabase" | "openai" | "elevenlabs" | "email";
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
      "elevenlabs",
      "ElevenLabs",
      ["ELEVENLABS_API_KEY", "ELEVENLABS_WEBHOOK_SECRET", "ELEVENLABS_AGENT_ID", "NEXT_PUBLIC_APP_URL"],
      "Canonical signed phone-call ingestion, history sync, transcripts, and secure audio"
    ),
    state(
      "email",
      "Microsoft 365",
      ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "MICROSOFT_TENANT_ID", "APP_ENCRYPTION_KEY", "NEXT_PUBLIC_APP_URL"],
      "The signed-in work mailbox, provider drafts and staff-approved sends. A separately delegated shared mailbox is not selected automatically."
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
