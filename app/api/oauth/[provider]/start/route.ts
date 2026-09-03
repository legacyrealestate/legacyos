import { NextResponse } from "next/server";
import { apiError } from "@/lib/security/api";
import { requireAdmin } from "@/lib/security/auth";
import { isOAuthProvider, oauthConfiguration, oauthRedirect, pkce, randomState } from "@/lib/security/oauth";

const safeReturnTo = (value: string | null) => value && value.startsWith("/") && !value.startsWith("//") ? value : null;

export async function GET(req: Request, context: { params: Promise<{ provider: string }> }) {
  try {
    await requireAdmin();
    const { provider: raw } = await context.params;
    if (!isOAuthProvider(raw)) return NextResponse.json({ success: false, code: "bad_request", error: "Unsupported provider." }, { status: 400 });
    const provider = raw;
    const state = randomState();
    const { verifier, challenge } = pkce();
    const configuration = oauthConfiguration(provider);
    const returnTo = safeReturnTo(new URL(req.url).searchParams.get("returnTo"));
    if (!configuration.clientId || !configuration.clientSecret || !configuration.authorizeUrl || !configuration.tokenUrl || !process.env.APP_ENCRYPTION_KEY) {
      if (returnTo) return NextResponse.redirect(new URL(`${returnTo}?connection_error=${provider}_not_configured`, req.url));
      return NextResponse.json({ success: false, code: "missing_configuration", error: `${provider} OAuth is not configured.` }, { status: 503 });
    }
    const url = new URL(configuration.authorizeUrl);
    url.searchParams.set("client_id", configuration.clientId);
    url.searchParams.set("redirect_uri", oauthRedirect(provider));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", configuration.scopes.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    if (provider === "google") { url.searchParams.set("access_type", "offline"); url.searchParams.set("prompt", "consent"); }
    // Start a fresh organization login. The tenant-specific authorize endpoint
    // rejects personal Outlook/Hotmail accounts and prevents a stale browser
    // session from silently selecting the wrong identity.
    if (provider === "microsoft") {
      url.searchParams.set("prompt", "login");
      url.searchParams.set("response_mode", "query");
    }
    const response = NextResponse.redirect(url);
    const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: `/api/oauth/${provider}`, maxAge: 600 };
    response.cookies.set(`legacy_oauth_state_${provider}`, state, options);
    response.cookies.set(`legacy_oauth_pkce_${provider}`, verifier, options);
    if (returnTo) response.cookies.set(`legacy_oauth_return_to_${provider}`, returnTo, options);
    return response;
  } catch (error) { return apiError(error); }
}
