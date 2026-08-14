import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("Elevate OAuth uses server credentials, PKCE, and encrypted token storage", () => {
  const oauth = read("lib/security/oauth.ts");
  const start = read("app/api/oauth/[provider]/start/route.ts");
  const callback = read("app/api/oauth/[provider]/callback/route.ts");
  assert.match(oauth, /ELEVATE_OAUTH_CLIENT_ID/);
  assert.match(oauth, /ELEVATE_OAUTH_CLIENT_SECRET/);
  assert.match(oauth, /ELEVATE_OAUTH_AUTHORIZE_URL/);
  assert.match(oauth, /ELEVATE_OAUTH_TOKEN_URL/);
  assert.match(start, /code_challenge_method/);
  assert.match(callback, /legacy_oauth_state_/);
  assert.match(callback, /encryptSecret/);
  assert.doesNotMatch(oauth, /NEXT_PUBLIC_ELEVATE/);
});

test("Elevate never requires a configured user ID and does not claim unverified calling automation", () => {
  const env = read(".env.example");
  const integrations = read("app/integrations/page.tsx");
  const elevate = read("lib/providers/elevate.ts");
  assert.doesNotMatch(env, /ELEVATE_USER_ID/);
  assert.match(integrations, /Call automation stays unavailable until the entitled Elevate calling endpoints are verified/);
  assert.match(elevate, /ELEVATE_OAUTH_PROFILE_URL/);
  assert.match(elevate, /Authorization: `Bearer \$\{token\}`/);
});

test("Elevate connection migration keeps provider connections protected by existing RLS", () => {
  const migration = read("supabase/migrations/20260814002119_elevate_oauth_connection.sql");
  assert.match(migration, /'elevate'/);
  assert.doesNotMatch(migration, /disable row level security/i);
  assert.match(migration, /reload schema/);
});
