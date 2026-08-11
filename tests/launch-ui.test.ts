import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path: string) => fs.readFileSync(path, "utf8");
const dashboard = read("app/page.tsx");
const dashboardApi = read("app/api/dashboard/route.ts");
const calls = read("app/calls/page.tsx");
const callsApi = read("app/api/calls/route.ts");
const email = read("app/email/page.tsx");
const emailApi = read("app/api/email/route.ts");
const integrations = read("app/integrations/page.tsx");
const integrationsApi = read("app/api/integrations/route.ts");

test("dashboard metrics are calculated by the authenticated production API", () => {
  assert.match(dashboardApi, /await requireUser\(\)/);
  for (const metric of ["callsToday", "callsWeek", "missedFailed", "openEmergencies", "callFollowUps", "emailsAwaitingReply", "draftsAwaitingApproval", "overdueFollowUps"]) assert.match(dashboardApi, new RegExp(metric));
  assert.match(dashboard, /\/api\/dashboard/);
  assert.match(dashboard, /callVolume/);
  assert.match(dashboard, /urgencyDistribution/);
});

test("Phone CRM exposes production filters and detail loading", () => {
  for (const filter of ["q", "urgency", "call_status", "direction", "property", "contact_id", "provider_agent_id", "call_outcome", "follow_up_status", "from", "to"]) assert.match(calls, new RegExp(filter));
  assert.match(callsApi, /ticket_updates\(id,type,title,description,created_at,created_by\)/);
  assert.match(calls, /Activity timeline/);
});

test("Phone CRM migration repairs the timeline relationship and reloads the API schema", () => {
  const repair = read("supabase/migrations/20260811130148_repair_phone_crm_and_alma_workspace.sql");
  assert.match(repair, /ticket_updates_ticket_id_fkey/);
  assert.match(repair, /notify pgrst, 'reload schema'/);
});

test("Phone CRM secure audio and ElevenLabs synchronization are real routes", () => {
  assert.match(calls, /\/api\/calls\/\$\{selected\.id\}\/audio/);
  assert.match(calls, /<audio controls preload="none"/);
  assert.match(calls, /fetch\("\/api\/elevenlabs\/sync"/);
  assert.match(calls, /Check its Vercel credentials and deployment/);
  assert.match(calls, /Import calls from ElevenLabs/);
});

test("ElevenLabs intake auto-routes only to an internal vendor recommendation", () => {
  const webhook = read("app/api/elevenlabs/route.ts");
  const sync = read("lib/providers/elevenlabs.ts");
  const routing = read("lib/workflows/vendor-routing.ts");
  const migration = read("supabase/migrations/20260811135039_import_legacy_vendor_directory_and_auto_route.sql");

  assert.match(webhook, /routeTicketToVendor\(ticketId, "elevenlabs_webhook"\)/);
  assert.match(sync, /routeTicketToVendor\(ticketId,"elevenlabs_sync"\)/);
  assert.match(routing, /never sends a vendor communication/);
  assert.match(migration, /'Pending Approval'/);
  assert.match(migration, /No vendor was selected or contacted automatically/);
  assert.match(migration, /revoke all on function public\.route_ticket_to_vendor\(uuid, text\) from public, anon, authenticated/);
});

test("shared inbox visibility includes shared connections and active staff", () => {
  assert.match(emailApi, /shared_with_staff\.eq\.true/);
  assert.match(emailApi, /from\("profiles"\)[\s\S]*eq\("active", true\)/);
  assert.match(email, /Shared email office/);
  assert.match(email, /Mailbox folders/);
});

test("staff connect and import the shared Gmail inbox from Email, not Integrations", () => {
  assert.match(email, /Connect Gmail/);
  assert.match(email, /Import and analyze email/);
  assert.match(email, /api\/oauth\/google\/start/);
  assert.doesNotMatch(email, /Open integrations/);
});

test("email thread selection and response controls use provider action routes", () => {
  assert.match(email, /setSelectedId\(thread\.id\)/);
  for (const action of ["reply", "reply_all", "forward", "draft", "send"]) assert.match(email, new RegExp(`"${action}"`));
  assert.match(email, /\/api\/email\/\$\{message\.id\}\/action/);
  assert.match(email, /Approve and send/);
  assert.match(email, /Reject draft/);
  assert.match(email, /Regenerate draft/);
});

test("integration UI never equates configuration with authentication", () => {
  assert.match(integrationsApi, /configured:/);
  assert.match(integrationsApi, /authenticated,/);
  assert.match(integrationsApi, /verificationStatus/);
  assert.match(integrations, /Environment variables alone never produce a connected state/);
  assert.match(integrationsApi, /missing_configuration/);
  assert.match(integrations, /needs_reconnect/);
  assert.match(integrations, /permission_denied/);
  assert.match(integrations, /provider_unavailable/);
  assert.doesNotMatch(integrations, /ElevenLabs/);
  assert.doesNotMatch(integrationsApi, /ELEVENLABS_/);
});

test("launch pages contain actionable disconnected, empty, loading, and error states", () => {
  for (const text of ["Operations data is unavailable", "No calls have been imported", "Loading command center"]) assert.ok(dashboard.includes(text));
  for (const text of ["No calls yet", "Loading calls", "Synchronization failed"]) assert.ok(calls.includes(text));
  for (const text of ["Mailbox authorization expired", "Connect the shared company mailbox", "Ready to import the shared mailbox", "Loading shared inbox"]) assert.ok(email.includes(text));
  for (const text of ["Connected but never synchronized", "Missing credentials", "provider could not be reached"]) assert.ok(integrations.includes(text));
});
