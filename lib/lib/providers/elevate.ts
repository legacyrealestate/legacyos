import "server-only";
import { ApiError } from "@/lib/security/api";
import { decryptSecret, encryptSecret } from "@/lib/security/encryption";
import { oauthConfiguration } from "@/lib/security/oauth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export type ElevateConnection = {
  id: string;
  encrypted_access_token: string | null;
  encrypted_refresh_token: string | null;
  access_token_expires_at: string | null;
};

export async function refreshElevateToken(connection: ElevateConnection) {
  if (connection.encrypted_access_token && connection.access_token_expires_at && new Date(connection.access_token_expires_at).getTime() > Date.now() + 60_000) return decryptSecret(connection.encrypted_access_token);
  if (!connection.encrypted_refresh_token) throw new ApiError("provider_failure", "Elevate authorization expired. Reconnect the account.");
  const configuration = oauthConfiguration("elevate");
  if (!configuration.clientId || !configuration.clientSecret || !configuration.tokenUrl) throw new ApiError("missing_configuration", "Elevate OAuth is not configured.");
  const response = await fetch(configuration.tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: decryptSecret(connection.encrypted_refresh_token), client_id: configuration.clientId, client_secret: configuration.clientSecret }), cache: "no-store" });
  const token = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok || typeof token.access_token !== "string") {
    if (response.status === 401 || response.status === 403) throw new ApiError("provider_failure", "Elevate authorization was revoked or lacks permission; reconnect the account.");
    throw new ApiError("provider_failure", "Elevate token refresh failed.");
  }
  const update: Record<string, unknown> = { encrypted_access_token: encryptSecret(token.access_token), access_token_expires_at: new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString(), status: "connected", last_error: null, updated_at: new Date().toISOString() };
  if (typeof token.refresh_token === "string") update.encrypted_refresh_token = encryptSecret(token.refresh_token);
  const { error } = await createServiceSupabaseClient().from("provider_connections").update(update).eq("id", connection.id);
  if (error) throw new ApiError("server_error", "Unable to store refreshed Elevate authorization.");
  return token.access_token;
}

export async function verifyElevateConnection(connection: ElevateConnection) {
  const profileUrl = process.env.ELEVATE_OAUTH_PROFILE_URL;
  if (!profileUrl) throw new ApiError("missing_configuration", "ELEVATE_OAUTH_PROFILE_URL is required to verify Elevate authorization.");
  const token = await refreshElevateToken(connection);
  const response = await fetch(profileUrl, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new ApiError("provider_failure", "Elevate authorization was revoked or lacks permission; reconnect the account.");
    throw new ApiError("provider_failure", `Elevate verification failed (${response.status}).`);
  }
  return response.status;
}
