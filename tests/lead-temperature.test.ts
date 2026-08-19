import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("lib/workflows/leasing.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260819153822_lead_temperature_and_email_lanes.sql", "utf8");

test("lead qualification uses transparent callback, tour, contact, and readiness signals", () => {
  for (const signal of ["Requested a callback", "Asked about a tour or showing", "Provided a phone number", "Provided move-in timing", "Provided a budget"]) {
    assert.match(source, new RegExp(signal));
  }
  assert.match(source, /score >= 60 \? "Hot" : score >= 30 \? "Warm" : "Cold"/);
});

test("lead temperature storage is constrained and indexed for lane filtering", () => {
  assert.match(migration, /lead_temperature text not null default 'Cold'/);
  assert.match(migration, /lead_temperature in \('Hot', 'Warm', 'Cold'\)/);
  assert.match(migration, /email_leads_temperature_updated_idx/);
});
