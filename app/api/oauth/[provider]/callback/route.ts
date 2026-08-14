import { NextResponse } from "next/server";
import { apiError, ApiError } from "@/lib/security/api";
import { requireAdmin } from "@/lib/security/auth";
import { encryptSecret } from "@/lib/security/encryption";
import { appOrigin, isOAuthProvider, oauthConfiguration, oauthRedirect } from "@/lib/security/oauth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request, context: { params: Promise<{ provider: string }> }) {
  try {
    const auth = await requireAdmin();
    const { provider: raw } = await context.params;
    if (!isOAuthProvider(raw)) throw new ApiError("bad_request", "Unsupported provider.");
    const provider = raw;
    const url = new URL(req.url), state = url.searchParams.get("state"), code = url.searchParams.get("code");
    const cookies = Object.fromEntries((req.headers.get("cookie") || "").split(";").map((v) => v.trim().split("=").map(decodeURIComponent)));
    if (!state || !code || state !== cookies[`legacy_oauth_state_${provider}`]) throw new ApiError("unauthorized", "OAuth state validation failed.");
    const verifier = cookies[`legacy_oauth_pkce_${provider}`];
    if (!verifier) throw new ApiError("unauthorized", "OAuth verifier is missing.");
    const configuration = oauthConfiguration(provider);
    if (!configuration.clientId || !configuration.clientSecret || !configuration.tokenUrl) throw new ApiError("missing_configuration", `${provider} OAuth is not configured.`);
    const body = new URLSearchParams({ code, client_id: configuration.clientId, client_secret: configuration.clientSecret, redirect_uri: oauthRedirect(provider), grant_type: "authorization_code", code_verifier: verifier });
    const tokenResponse = await fetch(configuration.tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
    const token = await tokenResponse.json() as Record<string, unknown>;
    if (!tokenResponse.ok || typeof token.access_token !== "string") throw new ApiError("provider_failure", `${provider} authorization failed.`);
    const profileUrl = provider === "google" ? "https://www.googleapis.com/oauth2/v2/userinfo" : provider === "microsoft" ? "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName" : process.env.ELEVATE_OAUTH_PROFILE_URL;
    const profileResponse = profileUrl ? await fetch(profileUrl, { headers: { Authorization: `Bearer ${token.access_token}` }, cache: "no-store" }) : null;
    const profile = profileResponse?.ok ? await profileResponse.json() as Record<string, unknown> : {};
    const accountEmail = String(profile.email || profile.mail || profile.userPrincipalName || "") || null;
    const supabase = createServiceSupabaseClient();
    const payload: Record<string, unknown> = { user_id: auth.user.id, provider, account_email: accountEmail, scopes: String(token.scope || "").split(" ").filter(Boolean), encrypted_access_token: encryptSecret(token.access_token), access_token_expires_at: new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString(), status: "connected", shared_with_staff: true, last_error: null, updated_at: new Date().toISOString() };
    if (typeof token.refresh_token === "string") payload.encrypted_refresh_token = encryptSecret(token.refresh_token);
    const { error } = await supabase.from("provider_connections").upsert(payload, { onConflict: "user_id,provider" });
    if (error) throw new ApiError("server_error", "Unable to save provider connection.");
    const response = NextResponse.redirect(`${appOrigin()}/integrations?connected=${provider}`);
    response.cookies.delete(`legacy_oauth_state_${provider}`); response.cookies.delete(`legacy_oauth_pkce_${provider}`);
    return response;
  } catch (error) { return apiError(error); }
}
