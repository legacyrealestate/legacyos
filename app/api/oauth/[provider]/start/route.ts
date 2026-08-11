import { NextResponse } from "next/server";
import { apiError } from "@/lib/security/api";
import { requireAdmin } from "@/lib/security/auth";
import { GOOGLE_SCOPES, MICROSOFT_SCOPES, oauthRedirect, pkce, randomState, type MailProvider } from "@/lib/security/oauth";

export async function GET(_req: Request, context: { params: Promise<{ provider: string }> }) {
  try {
    await requireAdmin();
    const { provider: raw } = await context.params;
    if (raw !== "google" && raw !== "microsoft") return NextResponse.json({ success: false, code: "bad_request", error: "Unsupported provider." }, { status: 400 });
    const provider: MailProvider = raw;
    const state = randomState();
    const { verifier, challenge } = pkce();
    const clientId = provider === "google" ? process.env.GOOGLE_CLIENT_ID : process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) return NextResponse.json({ success: false, code: "missing_configuration", error: `${provider} OAuth is not configured.` }, { status: 503 });
    const endpoint = provider === "google" ? "https://accounts.google.com/o/oauth2/v2/auth" : "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
    const scopes = provider === "google" ? GOOGLE_SCOPES : MICROSOFT_SCOPES;
    const url = new URL(endpoint);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", oauthRedirect(provider));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scopes.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    if (provider === "google") { url.searchParams.set("access_type", "offline"); url.searchParams.set("prompt", "consent"); }
    const response = NextResponse.redirect(url);
    const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: `/api/oauth/${provider}`, maxAge: 600 };
    response.cookies.set(`legacy_oauth_state_${provider}`, state, options);
    response.cookies.set(`legacy_oauth_pkce_${provider}`, verifier, options);
    return response;
  } catch (error) { return apiError(error); }
}
