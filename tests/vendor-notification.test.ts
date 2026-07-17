import assert from "node:assert/strict";
import test from "node:test";
import { sendClaimedVendorNotification, type VendorNotificationStore } from "../lib/workflows/vendor-notification.ts";

function makeStore(options?: {
  persistMessageSid?: boolean;
  secondaryFails?: boolean;
  reconciliationFails?: boolean;
}) {
  let claimed = false;
  let reconciliation = 0;
  let persistedSid: string | null = null;

  const store: VendorNotificationStore & {
    stats: () => {
      claimed: boolean;
      reconciliation: number;
      persistedSid: string | null;
    };
  } = {
    async claimAttempt() {
      if (claimed) return false;
      claimed = true;
      return true;
    },
    async persistMessageSid(messageSid) {
      if (options?.persistMessageSid === false) return false;
      persistedSid = messageSid;
      return true;
    },
    async markReconciliationRequired() {
      if (options?.reconciliationFails) throw new Error("reconciliation failed");
      reconciliation += 1;
    },
    async writeSecondarySuccess() {
      if (options?.secondaryFails) throw new Error("secondary failed");
    },
    stats() {
      return { claimed, reconciliation, persistedSid };
    },
  };

  return store;
}

test("simultaneous dispatch claims call sendSMS exactly once", async () => {
  const store = makeStore();
  let sends = 0;

  const send = async () => {
    sends += 1;
    return { sid: "SM123", status: "queued" };
  };

  const [first, second] = await Promise.all([
    sendClaimedVendorNotification({
      attemptKey: "attempt-1",
      to: "+16155550123",
      body: "work order",
      callbackUrl: "https://legacy.example/api/twilio/status",
      store,
      send,
    }),
    sendClaimedVendorNotification({
      attemptKey: "attempt-2",
      to: "+16155550123",
      body: "work order",
      callbackUrl: "https://legacy.example/api/twilio/status",
      store,
      send,
    }),
  ]);

  assert.equal(sends, 1);
  assert.equal([first.claimed, second.claimed].filter(Boolean).length, 1);
});

test("zero-row claim prevents provider send", async () => {
  const store = makeStore();
  await store.claimAttempt("already-claimed");
  let sends = 0;

  const result = await sendClaimedVendorNotification({
    attemptKey: "attempt-loser",
    to: "+16155550123",
    body: "work order",
    callbackUrl: "https://legacy.example/api/twilio/status",
    store,
    send: async () => {
      sends += 1;
      return { sid: "SM123", status: "queued" };
    },
  });

  assert.equal(result.claimed, false);
  assert.equal(sends, 0);
});

test("missing MessageSid after provider accept requires reconciliation", async () => {
  const store = makeStore();
  const result = await sendClaimedVendorNotification({
    attemptKey: "attempt-missing-sid",
    to: "+16155550123",
    body: "work order",
    callbackUrl: "https://legacy.example/api/twilio/status",
    store,
    send: async () => ({ sid: "", status: "queued" }),
  });

  assert.equal(result.status, "Reconciliation Required");
  assert.equal(store.stats().reconciliation, 1);
});

test("post-SID secondary write failure preserves SID and requires reconciliation", async () => {
  const store = makeStore({ secondaryFails: true });
  const result = await sendClaimedVendorNotification({
    attemptKey: "attempt-secondary-failure",
    to: "+16155550123",
    body: "work order",
    callbackUrl: "https://legacy.example/api/twilio/status",
    store,
    send: async () => ({ sid: "SM456", status: "queued" }),
  });

  assert.equal(result.status, "Reconciliation Required");
  assert.equal(result.messageSid, "SM456");
  assert.equal(store.stats().persistedSid, "SM456");
  assert.equal(store.stats().reconciliation, 1);
});

test("provider timeout after claim requires reconciliation and is not retryable failed", async () => {
  const store = makeStore();
  const result = await sendClaimedVendorNotification({
    attemptKey: "attempt-provider-error",
    to: "+16155550123",
    body: "work order",
    callbackUrl: "https://legacy.example/api/twilio/status",
    store,
    send: async () => {
      throw new Error("twilio raw details");
    },
  });

  assert.equal(result.status, "Reconciliation Required");
  assert.equal(result.error, "Vendor notification outcome is uncertain. Reconciliation is required before retry.");
  assert.equal(store.stats().reconciliation, 1);
});

test("reconciliation persistence failure remains sanitized and non-retryable", async () => {
  const store = makeStore({ reconciliationFails: true });
  const result = await sendClaimedVendorNotification({
    attemptKey: "attempt-reconciliation-fails",
    to: "+16155550123",
    body: "work order",
    callbackUrl: "https://legacy.example/api/twilio/status",
    store,
    send: async () => {
      throw new Error("network timeout");
    },
  });

  assert.equal(result.status, "Reconciliation Persistence Failed");
  assert.equal(result.error, "Vendor notification outcome is uncertain. Reconciliation is required before retry.");
  assert.equal(store.stats().reconciliation, 0);
});
