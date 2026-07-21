import { apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const auth = await requireUser(); const db = createServiceSupabaseClient();
    const [{ data: connections }, { data: checkpoints }, { data: smokeTests }] = await Promise.all([
      db.from("provider_connections").select("provider,account_email,status,last_sync_at,last_success_at,last_error,scopes").eq("user_id", auth.user.id),
      db.from("sync_checkpoints").select("provider,last_success_at,last_error"),
      db.from("integration_events").select("provider,status,safe_detail,created_at").eq("event_type","smoke_test").eq("external_id",auth.user.id)
    ]);
    const connection = (provider: string) => connections?.find((item) => item.provider === provider);
    const checkpoint = (provider: string) => checkpoints?.find((item) => item.provider === provider);
    const configured = (names: string[]) => names.every((name) => Boolean(process.env[name]));
    const providers = [
      { id: "supabase", configured: configured(["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY"]) },
      { id: "openai", configured: configured(["OPENAI_API_KEY"]) },
      { id: "elevenlabs", configured: configured(["ELEVENLABS_API_KEY","ELEVENLABS_AGENT_ID","ELEVENLABS_WEBHOOK_SECRET"]), checkpoint: checkpoint("elevenlabs") },
      { id: "twilio", configured: configured(["TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","TWILIO_PHONE_NUMBER"]) },
      { id: "google", configured: configured(["GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","APP_ENCRYPTION_KEY"]), connection: connection("google") },
      { id: "microsoft", configured: configured(["MICROSOFT_CLIENT_ID","MICROSOFT_CLIENT_SECRET","APP_ENCRYPTION_KEY"]), connection: connection("microsoft") },
    ].map((item) => {const smoke=smokeTests?.find(test=>test.provider===item.id);return { provider: item.id, status: item.connection?.status || (item.configured ? (item.checkpoint?.last_success_at ? "healthy" : item.id === "google" || item.id === "microsoft" ? "needs_authorization" : "configured") : "missing_configuration"), verificationStatus:smoke?.status||"never_tested",lastTestedAt:smoke?.created_at||null, accountEmail: item.connection?.account_email || null, lastSuccess: item.connection?.last_success_at || item.checkpoint?.last_success_at || null, lastError: item.connection?.last_error || item.checkpoint?.last_error || null }});
    return apiJson({ providers });
  } catch (error) { return apiError(error); }
}
