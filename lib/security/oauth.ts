import "server-only";
import crypto from "node:crypto";
import { ApiError } from "@/lib/security/api";

export type OAuthProvider = "google" | "microsoft" | "elevate";
export type MailProvider = Exclude<OAuthProvider, "elevate">;
export const GOOGLE_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.modify", "https://www.googleapis.com/auth/gmail.compose"];
export const MICROSOFT_SCOPES = ["openid", "email", "offline_access", "User.Read", "Mail.Read", "Mail.ReadWrite", "Mail.Send"];

type OAuthConfiguration = {
  clientId?: string;
  clientSecret?: string;
  authorizeUrl?: string;
  tokenUrl?: string;
  scopes: string[];
};

export function appOrigin() {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) throw new ApiError("missing_configuration", "NEXT_PUBLIC_APP_URL is not configured.");
  const url = new URL(raw);
  if (!/^https?:$/.test(url.protocol)) throw new ApiError("missing_configuration", "NEXT_PUBLIC_APP_URL is invalid.");
  return url.origin;
}
export function oauthRedirect(provider: OAuthProvider) { return `${appOrigin()}/api/oauth/${provider}/callback`; }

/**
 * Microsoft "common" also accepts personal Outlook/Hotmail accounts. LegacyOS
 * connects a company Microsoft 365 inbox, so use the company's tenant when it
 * is supplied and otherwise use Microsoft's work-or-school-only endpoint.
 */
export function microsoftTenant() {
  const tenant = process.env.MICROSOFT_TENANT_ID?.trim();
  return tenant && /^[0-9a-f-]{36}$/i.test(tenant) ? tenant : "organizations";
}

export function microsoftTokenUrl() {
  return `https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/token`;
}

export function oauthConfiguration(provider: OAuthProvider): OAuthConfiguration {
  if (provider === "google") return { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth", tokenUrl: "https://oauth2.googleapis.com/token", scopes: GOOGLE_SCOPES };
  if (provider === "microsoft") return { clientId: process.env.MICROSOFT_CLIENT_ID, clientSecret: process.env.MICROSOFT_CLIENT_SECRET, authorizeUrl: `https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/authorize`, tokenUrl: microsoftTokenUrl(), scopes: MICROSOFT_SCOPES };
  return {
    clientId: process.env.ELEVATE_OAUTH_CLIENT_ID,
    clientSecret: process.env.ELEVATE_OAUTH_CLIENT_SECRET,
    authorizeUrl: process.env.ELEVATE_OAUTH_AUTHORIZE_URL,
    tokenUrl: process.env.ELEVATE_OAUTH_TOKEN_URL,
    scopes: (process.env.ELEVATE_OAUTH_SCOPES || "openid offline_access").split(/[\\s,]+/).filter(Boolean),
  };
}

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "microsoft" || value === "elevate";
}

export function oauthIsConfigured(provider: OAuthProvider) {
  const configuration = oauthConfiguration(provider);
  return Boolean(configuration.clientId && configuration.clientSecret && configuration.authorizeUrl && configuration.tokenUrl && process.env.APP_ENCRYPTION_KEY);
}
export function pkce() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}
export function randomState() { return crypto.randomBytes(32).toString("base64url"); }
