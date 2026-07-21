import { NextResponse } from "next/server";
import { apiError, ApiError } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { encryptSecret } from "@/lib/security/encryption";
import { appOrigin, oauthRedirect, type MailProvider } from "@/lib/security/oauth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request, context: { params: Promise<{ provider: string }> }) {
  try {
    const auth = await requireUser();
    const { provider: raw } = await context.params;
    if (raw !== "google" && raw !== "microsoft") throw new ApiError("bad_request", "Unsupported provider.");
    const provider: MailProvider = raw;
    const url = new URL(req.url), state = url.searchParams.get("state"), code = url.searchParams.get("code");
    const cookies = Object.fromEntries((req.headers.get("cookie") || "").split(";").map((v) => v.trim().split("=").map(decodeURIComponent)));
    if (!state || !code || state !== cookies[`legacy_oauth_state_${provider}`]) throw new ApiError("unauthorized", "OAuth state validation failed.");
    const verifier = cookies[`legacy_oauth_pkce_${provider}`];
    if (!verifier) throw new ApiError("unauthorized", "OAuth verifier is missing.");
    const tokenUrl = provider === "google" ? "https://oauth2.googleapis.com/token" : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    const clientId = provider === "google" ? process.env.GOOGLE_CLIENT_ID : process.env.MICROSOFT_CLIENT_ID;
    const secret = provider === "google" ? process.env.GOOGLE_CLIENT_SECRET : process.env.MICROSOFT_CLIENT_SECRET;
    if (!clientId || !secret) throw new ApiError("missing_configuration", `${provider} OAuth is not configured.`);
    const body = new URLSearchParams({ code, client_id: clientId, client_secret: secret, redirect_uri: oauthRedirect(provider), grant_type: "authorization_code", code_verifier: verifier });
    const tokenResponse = await fetch(tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
    const token = await tokenResponse.json() as Record<string, unknown>;
    if (!tokenResponse.ok || typeof token.access_token !== "string") throw new ApiError("provider_failure", `${provider} authorization failed.`);
    const profileUrl = provider === "google" ? "https://www.googleapis.com/oauth2/v2/userinfo" : "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName";
    const profileResponse = await fetch(profileUrl, { headers: { Authorization: `Bearer ${token.access_token}` }, cache: "no-store" });
    const profile = profileResponse.ok ? await profileResponse.json() as Record<string, unknown> : {};
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
