import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync("supabase/migrations/202607170001_pilot_hardening.sql", "utf8");
const preflight = fs.readFileSync("docs/SUPABASE-PREFLIGHT.sql", "utf8");

function normalizeSql(sql: string) {
  return sql.replace(/--.*$/gm, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function extractFunction(name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = migration.match(
    new RegExp(
      `create or replace function public\\.${escapedName}\\(([\\s\\S]*?)\\)\\s*returns[\\s\\S]*?\\bas \\$\\$\\r?\\n([\\s\\S]*?)\\r?\\n\\$\\$;`,
      "i"
    )
  );
  assert.ok(match, `Expected to find function ${name}`);
  return { params: match[1], body: match[2] };
}

function extractIndexPredicate(indexName: string) {
  const match = migration.match(
    new RegExp(`create unique index if not exists ${indexName}[\\s\\S]*?\\bwhere ([\\s\\S]*?);`, "i")
  );
  assert.ok(match, `Expected to find index ${indexName}`);
  return normalizeSql(match[1]);
}

test("migration avoids invalid schema-qualified special SQL expressions", () => {
  assert.doesNotMatch(migration, /pg_catalog\.greatest/i);
  assert.doesNotMatch(migration, /pg_catalog\.trim/i);
  assert.match(migration, /\bgreatest\(open_jobs -/i);
  assert.match(migration, /pg_catalog\.btrim/i);
});

test("privileged RPCs revoke public access and grant only service_role", () => {
  for (const signature of [
    "public.create_or_repair_elevenlabs_intake(jsonb)",
    "public.increment_vendor_notification_counter(uuid, uuid)",
    "public.close_vendor_job_once(uuid, uuid)",
    "public.close_vendor_job_for_callback(uuid)",
    "public.claim_vendor_notification_attempt(uuid, uuid, uuid)",
    "public.persist_vendor_message_sid(uuid, uuid, text, text)",
    "public.mark_vendor_job_reconciliation_required(uuid, uuid)",
    "public.apply_twilio_vendor_callback(text, text)",
    "public.record_manual_vendor_contact(uuid, uuid, text)",
    "public.update_ticket_staff_status(uuid, uuid, text, text)",
    "public.escalate_ticket_emergency(uuid, uuid)",
  ]) {
    const escaped = signature.replace(/[()]/g, "\\$&");
    assert.match(migration, new RegExp(`revoke all on function ${escaped} from public, anon, authenticated`, "i"));
    assert.match(migration, new RegExp(`grant execute on function ${escaped} to service_role`, "i"));
  }
});

test("staff helper functions have minimum grants", () => {
  assert.match(migration, /revoke all on function public\.is_legacy_staff\(\) from public, anon/i);
  assert.match(migration, /revoke all on function public\.is_legacy_admin\(\) from public, anon/i);
  assert.match(migration, /grant execute on function public\.is_legacy_staff\(\) to authenticated, service_role/i);
  assert.match(migration, /grant execute on function public\.is_legacy_admin\(\) to authenticated, service_role/i);
});

test("security definer functions use a fixed search path without public", () => {
  const unsafeSearchPaths = [...migration.matchAll(/security definer\s+set search_path = ([^\n]+)/gi)]
    .map((match) => match[1].trim())
    .filter((pathValue) => /\bpublic\b/i.test(pathValue));

  assert.deepEqual(unsafeSearchPaths, []);
  assert.match(migration, /set search_path = pg_catalog, auth/i);
});

test("operational RLS keeps staff selects but removes direct write policies", () => {
  for (const table of ["maintenance_tickets", "vendor_jobs", "ticket_updates", "operations_feed", "notifications"]) {
    assert.match(migration, new RegExp(`create policy "staff read .*" on ${table} for select`, "i"));
  }

  assert.doesNotMatch(migration, /create policy "staff write tickets"/i);
  assert.doesNotMatch(migration, /create policy "staff update tickets"/i);
  assert.doesNotMatch(migration, /create policy "staff write vendor jobs"/i);
  assert.doesNotMatch(migration, /create policy "staff write ticket updates"/i);
  assert.doesNotMatch(migration, /create policy "staff write operations"/i);
  assert.doesNotMatch(migration, /create policy "staff write notifications"/i);
  assert.doesNotMatch(migration, /create policy "staff write vendors"/i);
});

test("unique guards match partial index predicates", () => {
  const activeIndexPredicate = extractIndexPredicate("one_active_vendor_job_per_ticket");
  const activeGuardMatch = migration.match(
    /from public\.vendor_jobs\s+where ([\s\S]*?)\s+group by ticket_id\s+having count\(\*\) > 1\s+\) then\s+raise exception 'Duplicate active vendor jobs/i
  );
  const activePreflightMatch = preflight.match(
    /select ticket_id, count\(\*\)\s+from public\.vendor_jobs\s+where ([\s\S]*?)\s+group by ticket_id\s+having count\(\*\) > 1;/i
  );
  assert.ok(activeGuardMatch, "Expected migration active vendor guard");
  assert.ok(activePreflightMatch, "Expected preflight active vendor guard");
  assert.equal(normalizeSql(activeGuardMatch[1]), activeIndexPredicate);
  assert.equal(normalizeSql(activePreflightMatch[1]), activeIndexPredicate);

  assert.equal(extractIndexPredicate("ticket_updates_once_per_ticket_type_idx"), "type in ('intake', 'escalation')");
  assert.match(preflight, /from public\.ticket_updates\s+where type in \('intake', 'escalation'\)/i);
  assert.equal(
    extractIndexPredicate("operations_feed_once_per_ticket_type_idx"),
    "related_ticket_id is not null and type in ('maintenance_intake', 'emergency')"
  );
  assert.equal(extractIndexPredicate("one_open_emergency_notification_per_ticket"), "type = 'emergency' and acknowledged_at is null");
});

test("migration is complete and does not recreate direct storage upload policy", () => {
  assert.match(migration, /drop policy if exists "staff upload private documents" on storage\.objects;[\s\S]*-- Document uploads are validated/);
  assert.doesNotMatch(migration, /create policy "staff upload private documents"/i);
  assert.equal((migration.match(/\$\$/g) || []).length % 2, 0);
  assert.match(migration.trimEnd(), /Do not recreate a direct authenticated storage upload policy here\.$/);
});

test("privileged RPCs do not reference undeclared input parameters", () => {
  for (const name of [
    "create_or_repair_elevenlabs_intake",
    "increment_vendor_notification_counter",
    "close_vendor_job_once",
    "close_vendor_job_for_callback",
    "claim_vendor_notification_attempt",
    "persist_vendor_message_sid",
    "mark_vendor_job_reconciliation_required",
    "apply_twilio_vendor_callback",
    "record_manual_vendor_contact",
    "update_ticket_staff_status",
    "escalate_ticket_emergency",
  ]) {
    const { params, body } = extractFunction(name);
    const allowedInputs = new Set([...params.matchAll(/\b([a-z][a-z0-9_]*_input)\b/g)].map((match) => match[1]));
    const bodyInputs = new Set([...body.matchAll(/\b([a-z][a-z0-9_]*_input)\b/g)].map((match) => match[1]));
    for (const identifier of bodyInputs) {
      assert.ok(allowedInputs.has(identifier), `${name} references undeclared ${identifier}`);
    }
  }
});

test("close and callback RPCs preserve terminal internal states", () => {
  const closeOnce = extractFunction("close_vendor_job_once").body;
  const closeForCallback = extractFunction("close_vendor_job_for_callback").body;
  const callback = extractFunction("apply_twilio_vendor_callback").body;

  assert.doesNotMatch(closeOnce, /temporary table/i);
  assert.match(closeOnce, /closed_at is null[\s\S]*notification_attempt_key is not null[\s\S]*provider_message_sid is not null[\s\S]*notification_status = 'Sending'/i);
  assert.match(closeOnce, /where counted[\s\S]*group by vendor_id/i);
  assert.match(closeForCallback, /closed_at is null/i);
  assert.match(closeForCallback, /should_decrement/i);
  assert.doesNotMatch(closeForCallback, /actor_id_input/i);

  assert.match(callback, /current_job_closed_at timestamptz/i);
  assert.match(callback, /current_job_status = 'Closed' or current_job_closed_at is not null/i);
  assert.match(callback, /where id = matched_job_id/i);
  assert.match(callback, /return jsonb_build_object\([\s\S]*'closed', true/i);
  assert.match(callback, /current_job_status in \('Delivered', 'Manually Contacted'\)/);
  assert.match(callback, /should_update_primary := current_primary_status = current_dispatch_status[\s\S]*or current_primary_status = 'Vendor Approved'/);
  assert.doesNotMatch(callback, /select id from public\.vendor_jobs where provider_message_sid = message_sid_input/i);
});

test("manual contact and staff status RPCs enforce launch rules", () => {
  const manualContact = extractFunction("record_manual_vendor_contact").body;
  const statusRpc = extractFunction("update_ticket_staff_status").body;

  assert.match(manualContact, /closed_at is null[\s\S]*for update/);
  assert.match(manualContact, /notification_counter_incremented_at = coalesce\(notification_counter_incremented_at, pg_catalog\.now\(\)\)/);
  assert.match(manualContact, /if not already_counted then[\s\S]*total_dispatched = total_dispatched \+ 1[\s\S]*open_jobs = open_jobs \+ 1/i);

  assert.match(statusRpc, /status_input not in \([\s\S]*'Resolved'[\s\S]*'Closed'/);
  assert.doesNotMatch(statusRpc, /'Emergency Escalated'/);
  assert.match(statusRpc, /if status_input in \('Resolved', 'Closed'\) then[\s\S]*public\.close_vendor_job_once\(ticket_id_input, actor_id_input\)/);
});

test("ticket route sends emergency status to emergency RPC, not generic status RPC", () => {
  const route = fs.readFileSync("app/api/tickets/[id]/route.ts", "utf8");
  assert.match(route, /nextStatus === "Emergency Escalated"[\s\S]*supabase\.rpc\("escalate_ticket_emergency"/);
  assert.doesNotMatch(route, /status_input: "Emergency Escalated"/);
});
