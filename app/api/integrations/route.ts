import { apiError, apiJson, ApiError } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const auth = await requireUser();
    const db = createServiceSupabaseClient();
    const [connections, checkpoints, smokeTests] = await Promise.all([
      db.from("provider_connections").select("provider,account_email,status,last_sync_at,last_success_at,last_error,scopes,shared_with_staff").or(`shared_with_staff.eq.true,user_id.eq.${auth.user.id}`),
      db.from("sync_checkpoints").select("provider,last_success_at,last_error,checkpoint,cursor"),
      db.from("integration_events").select("provider,status,safe_detail,created_at").eq("event_type", "smoke_test").eq("external_id", auth.user.id).order("created_at", { ascending: false }),
    ]);
    for (const result of [connections, checkpoints, smokeTests]) if (result.error) throw new ApiError(result.error.code === "42P01" ? "missing_migration" : "server_error", "Unable to load integration health.");
    const connection = (provider: string) => connections.data?.find(item => item.provider === provider);
    const checkpoint = (provider: string) => checkpoints.data?.find(item => item.provider === provider);
    const configured = (names: string[]) => names.every(name => Boolean(process.env[name]?.trim()));
    const definitions = [
      { id: "google", configured: configured(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "APP_ENCRYPTION_KEY"]), connection: connection("google"), checkpoint: checkpoint("google") },
      { id: "microsoft", configured: configured(["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "APP_ENCRYPTION_KEY"]), connection: connection("microsoft"), checkpoint: checkpoint("microsoft"), supportsSync: true },
      { id: "elevate", configured: configured(["ELEVATE_OAUTH_CLIENT_ID", "ELEVATE_OAUTH_CLIENT_SECRET", "ELEVATE_OAUTH_AUTHORIZE_URL", "ELEVATE_OAUTH_TOKEN_URL", "ELEVATE_OAUTH_PROFILE_URL", "APP_ENCRYPTION_KEY"]), connection: connection("elevate"), checkpoint: null, supportsSync: false },
    ];
    const providers = definitions.map(item => {
      const smoke = smokeTests.data?.find(test => test.provider === item.id);
      const authenticated = smoke?.status === "authenticated";
      const status = item.connection?.status || (!item.configured ? "missing_configuration" : authenticated ? "authenticated" : item.checkpoint?.last_success_at ? "healthy" : "needs_authorization");
      return {
        provider: item.id,
        configured: item.configured,
        authenticated,
        status,
        verificationStatus: smoke?.status || "never_tested",
        lastTestedAt: smoke?.created_at || null,
        accountEmail: item.connection?.account_email || null,
        lastSync: item.connection?.last_sync_at || item.checkpoint?.last_success_at || null,
        lastSuccess: item.connection?.last_success_at || item.checkpoint?.last_success_at || null,
        lastError: item.connection?.last_error || item.checkpoint?.last_error || null,
        supportsSync: item.supportsSync !== false,
      };
    });
    return apiJson({ providers });
  } catch (error) { return apiError(error); }
}
