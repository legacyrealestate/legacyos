import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import twilio from "twilio";
import { safeRelativeRedirect } from "../lib/security/redirects.ts";
import { verifyElevenLabsSignature } from "../lib/security/webhooks.ts";
import { verifyResendWebhook } from "../lib/security/resend-webhooks.ts";
import { normalizeUrgency, requiresHumanReview } from "../lib/workflows/classification.ts";
import { validateTwilioStatusCallbackSignature } from "../lib/communications/twilio.ts";
import { ApiError } from "../lib/security/errors.ts";
import {
  DOCUMENT_CATEGORIES,
  assertE164,
  assertOneOf,
  assertUuid,
  isAllowedDocumentType,
} from "../lib/security/validation.ts";

test("authentication-style guards reject invalid UUIDs", () => {
  assert.throws(() => assertUuid("not-a-uuid"), /Invalid id/);
});

test("maintenance request validation accepts E.164 phone numbers", () => {
  assert.equal(assertE164("+16155550123"), "+16155550123");
  assert.throws(() => assertE164("615-555-0123"), /E.164/);
});

test("document category and type validation reject unsupported input", () => {
  assert.equal(assertOneOf("Residents", DOCUMENT_CATEGORIES, "category"), "Residents");
  assert.throws(() => assertOneOf("Public", DOCUMENT_CATEGORIES, "category"), /Invalid category/);

  const pdf = new File(["x"], "notice.pdf", { type: "application/pdf" });
  const exe = new File(["x"], "tool.exe", { type: "application/x-msdownload" });
  assert.equal(isAllowedDocumentType(pdf), true);
  assert.equal(isAllowedDocumentType(exe), false);
});

test("ElevenLabs webhook signature verification accepts a fresh valid signature", () => {
  const secret = "unit-test-secret";
  const rawBody = JSON.stringify({ type: "post_call_transcription" });
  const timestamp = "1800000000";
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const result = verifyElevenLabsSignature({
    rawBody,
    secret,
    signatureHeader: `t=${timestamp},v0=${signature}`,
    nowMs: Number(timestamp) * 1000,
  });

  assert.equal(result.ok, true);
});

test("ElevenLabs webhook signature verification rejects invalid and stale signatures", () => {
  const invalid = verifyElevenLabsSignature({
    rawBody: "{}",
    secret: "unit-test-secret",
    signatureHeader: "t=1800000000,v0=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    nowMs: 1800000000000,
  });
  assert.equal(invalid.ok, false);

  const stale = verifyElevenLabsSignature({
    rawBody: "{}",
    secret: "unit-test-secret",
    signatureHeader: "t=1700000000,v0=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    nowMs: 1800000000000,
  });
  assert.equal(stale.ok, false);
});

test("Resend webhook verification accepts a fresh Svix signature", () => {
  const rawBody = JSON.stringify({ type: "email.received" });
  const id = "msg_test";
  const timestamp = "1800000000";
  const key = crypto.randomBytes(32);
  const secret = `whsec_${key.toString("base64")}`;
  const signature = crypto
    .createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");

  assert.equal(
    verifyResendWebhook({
      rawBody,
      id,
      timestamp,
      signature: `v1,${signature}`,
      secret,
      nowMs: Number(timestamp) * 1000,
    }),
    true
  );
});

test("urgency classification stops life-safety and legal workflows for review", () => {
  assert.equal(normalizeUrgency(null, "There is a gas smell in the kitchen"), "Emergency");
  assert.equal(normalizeUrgency("routine", "Paint touchup"), "Low");
  assert.equal(requiresHumanReview({ urgency: "Emergency", text: "gas smell" }), true);
  assert.equal(requiresHumanReview({ urgency: "Medium", text: "My attorney will contact you" }), true);
  assert.equal(requiresHumanReview({ urgency: "Medium", text: "What time can maintenance visit?" }), false);
});

test("service unavailable errors map to HTTP 503",()=>{const error=new ApiError("service_unavailable","Temporarily unavailable");assert.equal(error.status,503);assert.equal(error.code,"service_unavailable")});

test("auth callback redirect validation only accepts same-origin relative paths", () => {
  assert.equal(safeRelativeRedirect("/maintenance?ticket=1"), "/maintenance?ticket=1");
  assert.equal(safeRelativeRedirect("https://evil.example/maintenance"), null);
  assert.equal(safeRelativeRedirect("//evil.example/maintenance"), null);
  assert.equal(safeRelativeRedirect("%2F%2Fevil.example%2Fmaintenance"), null);
  assert.equal(safeRelativeRedirect("maintenance"), null);
  assert.equal(safeRelativeRedirect("%"), null);
});

test("Twilio callback signature uses the canonical server callback URL", () => {
  const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "https://legacy.example";

  const params = {
    MessageSid: "SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    MessageStatus: "delivered",
  };
  const authToken = "unit-test-token";
  const signature = twilio.getExpectedTwilioSignature(
    authToken,
    "https://legacy.example/api/twilio/status",
    params
  );

  assert.equal(
    validateTwilioStatusCallbackSignature({ authToken, signature, params }),
    true
  );

  const wrongSignature = twilio.getExpectedTwilioSignature(
    authToken,
    "https://attacker.example/api/twilio/status",
    params
  );
  assert.equal(
    validateTwilioStatusCallbackSignature({ authToken, signature: wrongSignature, params }),
    false
  );

  if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
});
