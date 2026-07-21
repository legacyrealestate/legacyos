import "server-only";
import crypto from "node:crypto";
import { ApiError } from "@/lib/security/api";

export type MailProvider = "google" | "microsoft";
export const GOOGLE_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.modify"];
export const MICROSOFT_SCOPES = ["openid", "email", "offline_access", "User.Read", "Mail.Read", "Mail.Send"];

export function appOrigin() {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) throw new ApiError("missing_configuration", "NEXT_PUBLIC_APP_URL is not configured.");
  const url = new URL(raw);
  if (!/^https?:$/.test(url.protocol)) throw new ApiError("missing_configuration", "NEXT_PUBLIC_APP_URL is invalid.");
  return url.origin;
}
export function oauthRedirect(provider: MailProvider) { return `${appOrigin()}/api/oauth/${provider}/callback`; }
export function pkce() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}
export function randomState() { return crypto.randomBytes(32).toString("base64url"); }
