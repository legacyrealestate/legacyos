import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migrationSql = fs
  .readFileSync("supabase/migrations/202607170001_pilot_hardening.sql", "utf8")
  .replace(/create extension if not exists pgcrypto;\r?\n/i, "");

const ACTOR_ID = "00000000-0000-4000-8000-000000000001";
const VENDOR_ID = "00000000-0000-4000-8000-000000000002";
const TICKET_ID = "00000000-0000-4000-8000-000000000003";
const JOB_ID = "00000000-0000-4000-8000-000000000004";
const MESSAGE_SID = "SM11111111111111111111111111111111";

type VendorCounterRow = {
  open_jobs: number;
  total_dispatched: number;
};

type JobStateRow = {
  status: string;
  notification_status: string;
  provider_status: string | null;
  closed_at: string | null;
};

type TicketStateRow = {
  status: string;
  dispatch_status: string | null;
};

async function setupDb() {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema auth;
    create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create table storage.buckets(
      id text primary key,
      name text,
      public boolean,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    create table storage.objects(
      id uuid primary key default gen_random_uuid(),
      bucket_id text,
      name text
    );
  `);
  await db.exec(migrationSql);
  await db.exec(`insert into auth.users(id) values ('${ACTOR_ID}');`);
  return db;
}

async function seedTicketAndVendor(
  db: PGlite,
  {
    ticketStatus = "Vendor Approved",
    dispatchStatus = "Sent",
    jobStatus = "Sent",
    notificationStatus = "sent",
    providerStatus = "sent",
    messageSid = MESSAGE_SID,
    counted = true,
    vendorOpenJobs = counted ? 1 : 0,
    vendorTotalDispatched = counted ? 1 : 0,
  }: {
    ticketStatus?: string;
    dispatchStatus?: string;
    jobStatus?: string;
    notificationStatus?: string;
    providerStatus?: string | null;
    messageSid?: string | null;
    counted?: boolean;
    vendorOpenJobs?: number;
    vendorTotalDispatched?: number;
  } = {}
) {
  await db.exec(`
    insert into public.vendors (
      id, name, trade, open_jobs, total_dispatched
    ) values (
      '${VENDOR_ID}', 'Runtime Plumbing', 'Plumbing', ${vendorOpenJobs}, ${vendorTotalDispatched}
    );

    insert into public.maintenance_tickets (
      id, tenant_name, property, issue, status, dispatch_status, updated_by
    ) values (
      '${TICKET_ID}', 'Runtime Resident', 'Runtime Property', 'Runtime leak',
      '${ticketStatus}', '${dispatchStatus}', '${ACTOR_ID}'
    );

    insert into public.vendor_jobs (
      id, ticket_id, vendor_id, vendor_name, status, notification_status,
      provider_message_sid, provider_status, notification_counter_incremented_at
    ) values (
      '${JOB_ID}', '${TICKET_ID}', '${VENDOR_ID}', 'Runtime Plumbing',
      '${jobStatus}', '${notificationStatus}', ${messageSid ? `'${messageSid}'` : "null"},
      ${providerStatus ? `'${providerStatus}'` : "null"},
      ${counted ? "pg_catalog.now()" : "null"}
    );
  `);
}

async function one<T extends Record<string, unknown>>(db: PGlite, sql: string) {
  const result = await db.query<T>(sql);
  assert.equal(result.rows.length, 1);
  return result.rows[0];
}

async function vendorCounters(db: PGlite) {
  return one<VendorCounterRow>(db, `select open_jobs, total_dispatched from public.vendors where id = '${VENDOR_ID}'`);
}

async function jobState(db: PGlite) {
  return one<JobStateRow>(
    db,
    `select status, notification_status, provider_status, closed_at::text from public.vendor_jobs where id = '${JOB_ID}'`
  );
}

async function ticketState(db: PGlite) {
  return one<TicketStateRow>(
    db,
    `select status, dispatch_status from public.maintenance_tickets where id = '${TICKET_ID}'`
  );
}

test("pilot hardening migration executes in a disposable PostgreSQL-compatible database", async () => {
  const db = await setupDb();
  try {
    const tableCount = await one<{ count: number }>(
      db,
      "select count(*)::integer as count from information_schema.tables where table_schema = 'public'"
    );
    assert.ok(tableCount.count >= 8);
  } finally {
    await db.close();
  }
});

test("manual vendor contact updates ticket, job, and counters exactly once", async () => {
  const db = await setupDb();
  try {
    await seedTicketAndVendor(db, {
      ticketStatus: "Vendor Approved",
      dispatchStatus: "Approved",
      jobStatus: "Approved",
      notificationStatus: "Approved",
      providerStatus: null,
      messageSid: null,
      counted: false,
    });

    await db.query(
      `select * from public.record_manual_vendor_contact('${TICKET_ID}', '${ACTOR_ID}', 'Called vendor directly')`
    );
    await assert.rejects(() =>
      db.query(`select * from public.record_manual_vendor_contact('${TICKET_ID}', '${ACTOR_ID}', 'Called twice')`)
    );

    assert.deepEqual(await vendorCounters(db), { open_jobs: 1, total_dispatched: 1 });
    assert.equal((await jobState(db)).status, "Manually Contacted");
    assert.equal((await ticketState(db)).status, "Manually Contacted");
  } finally {
    await db.close();
  }
});

test("resolving a ticket closes counted jobs and decrements counters once", async () => {
  const db = await setupDb();
  try {
    await seedTicketAndVendor(db);

    await db.query(`select * from public.update_ticket_staff_status('${TICKET_ID}', '${ACTOR_ID}', 'Resolved', 'Done')`);
    await db.query(`select * from public.update_ticket_staff_status('${TICKET_ID}', '${ACTOR_ID}', 'Resolved', 'Still done')`);

    assert.deepEqual(await vendorCounters(db), { open_jobs: 0, total_dispatched: 1 });
    const job = await jobState(db);
    assert.equal(job.status, "Closed");
    assert.ok(job.closed_at);
  } finally {
    await db.close();
  }
});

test("failed Twilio callbacks close and decrement once while preserving resolved primary status", async () => {
  const db = await setupDb();
  try {
    await seedTicketAndVendor(db, {
      ticketStatus: "Resolved",
      dispatchStatus: "Sent",
      jobStatus: "Sent",
      notificationStatus: "sent",
    });

    await db.query(`select public.apply_twilio_vendor_callback('${MESSAGE_SID}', 'undelivered')`);
    assert.deepEqual(await vendorCounters(db), { open_jobs: 0, total_dispatched: 1 });
    assert.equal((await jobState(db)).status, "Closed");
    assert.deepEqual(await ticketState(db), { status: "Resolved", dispatch_status: "Failed" });

    await db.query(`select public.apply_twilio_vendor_callback('${MESSAGE_SID}', 'undelivered')`);
    assert.deepEqual(await vendorCounters(db), { open_jobs: 0, total_dispatched: 1 });
    assert.equal((await jobState(db)).status, "Closed");

    await db.query(`select public.apply_twilio_vendor_callback('${MESSAGE_SID}', 'delivered')`);
    const job = await jobState(db);
    assert.equal(job.status, "Closed");
    assert.equal(job.provider_status, "delivered");
    assert.deepEqual(await vendorCounters(db), { open_jobs: 0, total_dispatched: 1 });
    assert.equal((await ticketState(db)).status, "Resolved");
  } finally {
    await db.close();
  }
});

test("manually contacted jobs remain terminal after provider failure callbacks", async () => {
  const db = await setupDb();
  try {
    await seedTicketAndVendor(db, {
      ticketStatus: "Manually Contacted",
      dispatchStatus: "Manually Contacted",
      jobStatus: "Manually Contacted",
      notificationStatus: "Manually Contacted",
      providerStatus: "sent",
      counted: true,
    });

    await db.query(`select public.apply_twilio_vendor_callback('${MESSAGE_SID}', 'failed')`);

    assert.equal((await jobState(db)).status, "Manually Contacted");
    assert.deepEqual(await ticketState(db), {
      status: "Manually Contacted",
      dispatch_status: "Manually Contacted",
    });
    assert.deepEqual(await vendorCounters(db), { open_jobs: 1, total_dispatched: 1 });
  } finally {
    await db.close();
  }
});

test("generic staff-status RPC rejects emergency escalation", async () => {
  const db = await setupDb();
  try {
    await seedTicketAndVendor(db, {
      ticketStatus: "Needs Review",
      dispatchStatus: "Recommended",
      jobStatus: "Approved",
      notificationStatus: "Approved",
      counted: false,
      messageSid: null,
      providerStatus: null,
    });

    await assert.rejects(() =>
      db.query(`select * from public.update_ticket_staff_status('${TICKET_ID}', '${ACTOR_ID}', 'Emergency Escalated', 'Emergency')`)
    );
  } finally {
    await db.close();
  }
});

test("emergency RPC creates only one open notification and activity when repeated", async () => {
  const db = await setupDb();
  try {
    await seedTicketAndVendor(db, {
      ticketStatus: "Needs Review",
      dispatchStatus: "Recommended",
      jobStatus: "Approved",
      notificationStatus: "Approved",
      counted: false,
      messageSid: null,
      providerStatus: null,
    });

    await db.query(`select public.escalate_ticket_emergency('${TICKET_ID}', '${ACTOR_ID}')`);
    await db.query(`select public.escalate_ticket_emergency('${TICKET_ID}', '${ACTOR_ID}')`);

    const notifications = await one<{ count: number }>(
      db,
      `select count(*)::integer as count from public.notifications where related_ticket_id = '${TICKET_ID}' and type = 'emergency' and acknowledged_at is null`
    );
    const operations = await one<{ count: number }>(
      db,
      `select count(*)::integer as count from public.operations_feed where related_ticket_id = '${TICKET_ID}' and type = 'emergency'`
    );
    const updates = await one<{ count: number }>(
      db,
      `select count(*)::integer as count from public.ticket_updates where ticket_id = '${TICKET_ID}' and type = 'escalation'`
    );

    assert.equal(notifications.count, 1);
    assert.equal(operations.count, 1);
    assert.equal(updates.count, 1);
  } finally {
    await db.close();
  }
});
