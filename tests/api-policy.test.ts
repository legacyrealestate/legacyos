import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { PUBLIC_API_ROUTES, PUBLIC_PAGE_ROUTES } from "../lib/security/public-routes.ts";

const repoRoot = process.cwd();
const apiRoot = path.join(repoRoot, "app", "api");

function walkRoutes(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkRoutes(fullPath);
    return entry.name === "route.ts" ? [fullPath] : [];
  });
}

function apiPathFor(filePath: string) {
  const relative = path.relative(apiRoot, path.dirname(filePath)).replaceAll(path.sep, "/");
  return `/api/${relative}`;
}

test("all non-public API routes enforce server-side auth in the route file", () => {
  const unguarded = walkRoutes(apiRoot)
    .map((filePath) => ({
      apiPath: apiPathFor(filePath),
      source: fs.readFileSync(filePath, "utf8"),
    }))
    .filter(({ apiPath }) => !PUBLIC_API_ROUTES.has(apiPath))
    .filter(({ source }) => !source.includes("requireUser(") && !source.includes("requireAdmin(") && !source.includes("requireCron("));

  assert.deepEqual(unguarded.map((route) => route.apiPath), []);
});

test("public API allowlist is limited to signed provider webhooks", () => {
  assert.deepEqual([...PUBLIC_API_ROUTES].sort(), ["/api/elevenlabs", "/api/email/webhook", "/api/twilio/status", "/api/twilio/voice/call-status", "/api/twilio/voice/inbound", "/api/twilio/voice/outbound", "/api/twilio/voice/recording", "/api/twilio/voice/transcription"].sort());
});

test("public page allowlist includes the Supabase auth callback", () => {
  assert.equal(PUBLIC_PAGE_ROUTES.has("/auth/callback"), true);
});

test("proxy uses explicit static asset rules instead of broad dotted pathname bypass", () => {
  const source = fs.readFileSync(path.join(repoRoot, "proxy.ts"), "utf8");
  assert.equal(source.includes('pathname.includes(".")'), false);
  assert.match(source, /_next\/static/);
  assert.match(source, /favicon\.ico/);
});

test("obsolete public login and simulation API routes do not exist", () => {
  assert.equal(fs.existsSync(path.join(apiRoot, "login", "route.ts")), false);
  assert.equal(fs.existsSync(path.join(apiRoot, "simulate", "route.ts")), false);
});

test("API routes do not instantiate service-role Supabase clients directly", () => {
  const directServiceRoleUsers = walkRoutes(apiRoot)
    .filter((filePath) => {
      const source = fs.readFileSync(filePath, "utf8");
      return source.includes("SUPABASE_SERVICE_ROLE_KEY") || source.includes("createClient(");
    })
    .map((filePath) => apiPathFor(filePath));

  assert.deepEqual(directServiceRoleUsers, []);
});
