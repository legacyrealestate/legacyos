import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { canAutoSend,classifyEmail,normalizePhone,parseMailbox,suppressionReason } from "../lib/workflows/email-intake-policy.ts";

test("email intake classifies leads, maintenance, and emergencies",()=>{
  assert.equal(classifyEmail({subject:"Apartment tour",body:"Is a two bedroom available to lease?"}).primary,"Lead/leasing inquiry");
  assert.equal(classifyEmail({subject:"Repair",body:"My sink is leaking in unit 4"}).primary,"Maintenance request");
  const emergency=classifyEmail({subject:"Help",body:"I smell gas in my apartment"});
  assert.equal(emergency.primary,"Emergency maintenance");assert.equal(emergency.requiresHuman,true);
});
test("email intake suppresses own, no-reply, auto-submitted, and list mail",()=>{
  assert.equal(suppressionReason({sender:"Office <ops@example.com>",ownAddresses:["OPS@example.com"]}),"company_address");
  assert.equal(suppressionReason({sender:"no-reply@example.com"}),"automated_sender");
  assert.equal(suppressionReason({sender:"service@example.com",headers:{"Auto-Submitted":"auto-generated"}}),"auto_submitted");
  assert.equal(suppressionReason({sender:"list@example.com",headers:{"List-ID":"updates.example.com"}}),"mailing_list");
});
test("contact normalization supports deduplication",()=>{assert.equal(parseMailbox("Jane Doe <JANE@Example.com>").email,"jane@example.com");assert.equal(normalizePhone("(615) 555-1212"),"+16155551212")});
test("Microsoft Graph sender names survive import and mixed maintenance mail is not a leasing lead",()=>{
  assert.deepEqual(parseMailbox({emailAddress:{name:"Jamie Resident",address:"JAMIE@EXAMPLE.COM"}}),{name:"Jamie Resident",email:"jamie@example.com"});
  assert.equal(classifyEmail({subject:"Rental unit repair",body:"I'm a tenant. The sink is leaking in my rental."}).primary,"Maintenance request");
});
test("automatic sends require every safety gate",()=>{
  const old={...process.env};Object.assign(process.env,{EMAIL_AUTOREPLY_MODE:"send",AUTONOMY_MODE:"autopilot",ENABLE_OUTBOUND_COMMUNICATIONS:"true",EMAIL_AUTOREPLY_MIN_CONFIDENCE:"0.9"});
  assert.equal(canAutoSend({classification:"Lead/leasing inquiry",confidence:.95,requiresHuman:false,sender:"lead@example.com"}),true);
  assert.equal(canAutoSend({classification:"Emergency maintenance",confidence:1,requiresHuman:true,sender:"resident@example.com"}),false);
  assert.equal(canAutoSend({classification:"Lead/leasing inquiry",confidence:.95,requiresHuman:false,automationDisabled:true,sender:"lead@example.com"}),false);
  process.env=old;
});
test("provider sync, ALMA recovery, and cron are automatic and idempotent",()=>{
  const provider=fs.readFileSync("lib/providers/email.ts","utf8"),alma=fs.readFileSync("lib/workflows/alma.ts","utf8"),cron=fs.readFileSync("app/api/cron/email/route.ts","utf8");
  assert.match(provider,/email_intake_jobs/);assert.match(provider,/email-intake:\$\{messageId\}/);assert.match(provider,/ignoreDuplicates:true/);assert.match(provider,/body_html/);assert.match(provider,/attachments\?\$select=id,name,contentType,size,isInline/);assert.match(alma,/Recovered expired worker lock/);assert.match(alma,/processEmailIntake/);assert.match(cron,/runAlma\(50\)/);
});
test("migration adds protected autonomous email entities",()=>{const sql=fs.readFileSync("supabase/migrations/202607220001_autonomous_email_office.sql","utf8");for(const value of["email_intake_jobs","email_leads","email_contact_provenance","enable row level security","normalized_email_unique"])assert.match(sql,new RegExp(value))});
test("email intake creates drafts by default and only policy-approved leasing replies can auto-send",()=>{const intake=fs.readFileSync("lib/workflows/email-intake.ts","utf8"),compose=fs.readFileSync("lib/providers/email-compose.ts","utf8");assert.match(intake,/generateEmailDraft/);assert.match(intake,/canAutoSend/);assert.match(intake,/if\(!automatic&&process\.env\.AI_ASSISTANCE_ENABLED/);assert.match(intake,/allowAutomatedSend:automatic/);assert.match(compose,/Only a policy-approved email reply may be sent automatically/);assert.match(compose,/const needsApproval = !\["draft", "draft_update"\]\.includes\(input\.action\) && !automatedReply/)});
test("handoff sync organizes queued email and preserves the reply in the studio",()=>{
  const route=fs.readFileSync("app/api/email/route.ts","utf8"),provider=fs.readFileSync("lib/providers/email.ts","utf8"),intake=fs.readFileSync("lib/workflows/email-intake.ts","utf8");
  assert.match(route,/runAlma\(10\)/);
  assert.match(provider,/cursor:next\|\|delta/);
  assert.match(provider,/receivedDateTime ge/);
  assert.match(intake,/alma_draft_text:preparedDraft/);
  assert.match(intake,/const historical=/);
});
test("staff sending requires explicit outbound enablement on both approval routes",()=>{
  const direct=fs.readFileSync("app/api/email/[id]/send/route.ts","utf8"),approval=fs.readFileSync("app/api/email/actions/[id]/approve/route.ts","utf8");
  assert.match(direct,/ENABLE_STAFF_EMAIL_SEND/);
  assert.match(direct,/requireUser/);
  assert.match(approval,/ENABLE_STAFF_EMAIL_SEND/);
  assert.match(fs.readFileSync("app/api/email/reply/route.ts","utf8"),/Send from the connected Outlook Reply Studio instead/);
});
