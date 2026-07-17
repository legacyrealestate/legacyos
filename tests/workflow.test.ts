import assert from "node:assert/strict";
import test from "node:test";
import {
  applyVendorCallbackTransition,
  canChangeVendorBeforeExternalAttempt,
  isStaffControlledTicketStatus,
  mapTwilioStatus,
  monotonicDispatchStatus,
  shouldBlockExternalRetry,
} from "../lib/workflows/dispatch-state.ts";
import { outboundEnabled } from "../lib/communications/sms.ts";
import { normalizeElevenLabsPayload } from "../lib/workflows/elevenlabs.ts";
import { rankVendors } from "../lib/workflows/vendors.ts";

test("vendor recommendation ranks active matching vendors first", () => {
  const ranked = rankVendors(
    [
      { id: "1", name: "General Vendor", dispatch_keywords: ["paint"], active: true },
      {
        id: "2",
        name: "Preferred Plumbing",
        dispatch_keywords: ["leak", "pipe"],
        priority: "Preferred",
        emergency_available: true,
        active: true,
      },
      { id: "3", name: "Inactive Plumbing", dispatch_keywords: ["leak"], active: false },
    ],
    "Emergency leak under sink"
  );

  assert.equal(ranked[0].name, "Preferred Plumbing");
  assert.equal(ranked.some((vendor) => vendor.name === "Inactive Plumbing"), false);
});

test("outbound communications are disabled by default", () => {
  delete process.env.ENABLE_OUTBOUND_COMMUNICATIONS;
  assert.equal(outboundEnabled(), false);
  process.env.ENABLE_OUTBOUND_COMMUNICATIONS = "false";
  assert.equal(outboundEnabled(), false);
});

test("disabled preview can continue later and can change vendor before external attempt", () => {
  const disabledJob = {
    status: "Approved",
    notification_status: "Disabled",
    provider_message_sid: null,
    notification_attempt_key: null,
  };

  assert.equal(shouldBlockExternalRetry(disabledJob), false);
  assert.equal(canChangeVendorBeforeExternalAttempt(disabledJob), true);
});

test("repeated approval is blocked after an external attempt starts", () => {
  assert.equal(
    shouldBlockExternalRetry({
      status: "Notification Queued",
      notification_status: "Sending",
      provider_message_sid: null,
      notification_attempt_key: "00000000-0000-4000-8000-000000000001",
    }),
    true
  );

  assert.equal(
    canChangeVendorBeforeExternalAttempt({
      status: "Notification Queued",
      notification_status: "Sending",
      provider_message_sid: null,
    }),
    false
  );
});

test("post-Twilio reconciliation required blocks automatic resend", () => {
  assert.equal(
    shouldBlockExternalRetry({
      status: "Reconciliation Required",
      notification_status: "Reconciliation Required",
      provider_message_sid: null,
      notification_attempt_key: "00000000-0000-4000-8000-000000000002",
    }),
    true
  );
});

test("manual contact is terminal for external retry and vendor changes", () => {
  const manualJob = {
    status: "Manually Contacted",
    notification_status: "Manually Contacted",
    provider_message_sid: null,
    notification_attempt_key: null,
  };

  assert.equal(shouldBlockExternalRetry(manualJob), true);
  assert.equal(canChangeVendorBeforeExternalAttempt(manualJob), false);
});

test("failed and closed jobs cannot be reused for vendor changes", () => {
  assert.equal(
    canChangeVendorBeforeExternalAttempt({
      status: "Failed",
      notification_status: "failed",
      provider_message_sid: null,
    }),
    false
  );
  assert.equal(
    canChangeVendorBeforeExternalAttempt({
      status: "Closed",
      notification_status: "Closed",
      provider_message_sid: null,
    }),
    false
  );
});

test("Twilio provider statuses map to correct ticket semantics", () => {
  for (const status of ["queued", "accepted", "scheduled", "sending"]) {
    assert.equal(mapTwilioStatus(status), "Notification Queued");
  }

  assert.equal(mapTwilioStatus("sent"), "Sent");
  assert.equal(mapTwilioStatus("delivered"), "Delivered");
  assert.equal(mapTwilioStatus("failed"), "Failed");
  assert.equal(mapTwilioStatus("undelivered"), "Failed");
  assert.equal(mapTwilioStatus("canceled"), "Failed");
  assert.equal(mapTwilioStatus("mystery"), null);
});

test("delivered cannot regress to sent and unknown statuses do not advance", () => {
  assert.equal(monotonicDispatchStatus("Delivered", mapTwilioStatus("sent")), "Delivered");
  assert.equal(monotonicDispatchStatus("Sent", mapTwilioStatus("delivered")), "Delivered");
  assert.equal(monotonicDispatchStatus("Sent", mapTwilioStatus("mystery")), "Sent");
});

test("callback transition preserves terminal job and ticket states together", () => {
  assert.deepEqual(
    applyVendorCallbackTransition({
      jobStatus: "Delivered",
      ticketStatus: "Delivered",
      providerStatus: "failed",
    }),
    { jobStatus: "Delivered", ticketStatus: "Delivered", ignored: false }
  );

  assert.deepEqual(
    applyVendorCallbackTransition({
      jobStatus: "Sent",
      ticketStatus: "Sent",
      providerStatus: "delivered",
    }),
    { jobStatus: "Delivered", ticketStatus: "Delivered", ignored: false }
  );

  assert.deepEqual(
    applyVendorCallbackTransition({
      jobStatus: "Manually Contacted",
      ticketStatus: "Manually Contacted",
      providerStatus: "undelivered",
    }),
    { jobStatus: "Manually Contacted", ticketStatus: "Manually Contacted", ignored: false }
  );

  assert.deepEqual(
    applyVendorCallbackTransition({
      jobStatus: "Sent",
      ticketStatus: "Sent",
      providerStatus: "undelivered",
    }),
    { jobStatus: "Failed", ticketStatus: "Failed", ignored: false }
  );

  assert.deepEqual(
    applyVendorCallbackTransition({
      jobStatus: "Sent",
      ticketStatus: "Sent",
      providerStatus: "unknown-provider-state",
    }),
    { jobStatus: "Sent", ticketStatus: "Sent", ignored: true }
  );
});

test("staff cannot manually set provider-controlled delivery states", () => {
  assert.equal(isStaffControlledTicketStatus("Needs Review"), true);
  assert.equal(isStaffControlledTicketStatus("Resolved"), true);
  assert.equal(isStaffControlledTicketStatus("Emergency Escalated"), false);
  assert.equal(isStaffControlledTicketStatus("Sent"), false);
  assert.equal(isStaffControlledTicketStatus("Delivered"), false);
  assert.equal(isStaffControlledTicketStatus("Notification Queued"), false);
});

test("ElevenLabs official post_call_transcription payload normalizes numeric timing", () => {
  const normalized = normalizeElevenLabsPayload({
    type: "post_call_transcription",
    data: {
      conversation_id: "conv_123",
      agent_id: "agent_123",
      status: "done",
      metadata: {
        start_time_unix_secs: 1800000000,
        call_duration_secs: 125,
        phone_call: {
          external_number: "+16155550123",
        },
      },
      transcript: [{ role: "user", message: "Kitchen sink is leaking." }],
      analysis: {
        transcript_summary: "Resident reported a kitchen sink leak.",
        data_collection_results: {
          resident_name: { value: "Resident One" },
          property: { value: "100 Main St" },
          unit: { value: "2A" },
          issue_category: { value: "Plumbing" },
          issue_details: { value: "Kitchen sink leak" },
          urgency: { value: "High" },
        },
      },
    },
  });

  assert.equal(normalized.eventType, "post_call_transcription");
  assert.equal(normalized.conversationId, "conv_123");
  assert.equal(normalized.callerPhone, "+16155550123");
  assert.equal(normalized.callStartedAt, "2027-01-15T08:00:00.000Z");
  assert.equal(normalized.callEndedAt, "2027-01-15T08:02:05.000Z");
});
