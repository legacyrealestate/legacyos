export type SmsSender = (input: {
  to: string;
  body: string;
  type: "vendor_notification";
  statusCallbackUrl: string;
}) => Promise<{ sid?: string | null; status?: string | null }>;

export type VendorNotificationStore = {
  claimAttempt: (attemptKey: string) => Promise<boolean>;
  persistMessageSid: (messageSid: string, providerStatus: string) => Promise<boolean>;
  markReconciliationRequired: () => Promise<void>;
  writeSecondarySuccess: (messageSid: string, providerStatus: string) => Promise<void>;
};

export async function sendClaimedVendorNotification({
  attemptKey,
  to,
  body,
  callbackUrl,
  store,
  send,
}: {
  attemptKey: string;
  to: string;
  body: string;
  callbackUrl: string;
  store: VendorNotificationStore;
  send: SmsSender;
}) {
  const claimed = await store.claimAttempt(attemptKey);
  if (!claimed) {
    return { sent: false, claimed: false, status: "Already Claimed" as const };
  }

  try {
    const sms = await send({
      to,
      body,
      type: "vendor_notification",
      statusCallbackUrl: callbackUrl,
    });
    const messageSid = typeof sms.sid === "string" && sms.sid.trim() ? sms.sid.trim() : null;

    if (!messageSid) {
      const reconciled = await markReconciliation(store);
      return {
        sent: true,
        claimed: true,
        status: reconciled ? "Reconciliation Required" as const : "Reconciliation Persistence Failed" as const,
        error: "Provider accepted the request without a MessageSid.",
      };
    }

    const providerStatus = sms.status || "queued";
    const persisted = await store.persistMessageSid(messageSid, providerStatus);
    if (!persisted) {
      const reconciled = await markReconciliation(store);
      return {
        sent: true,
        claimed: true,
        status: reconciled ? "Reconciliation Required" as const : "Reconciliation Persistence Failed" as const,
        messageSid,
      };
    }

    try {
      await store.writeSecondarySuccess(messageSid, providerStatus);
    } catch {
      const reconciled = await markReconciliation(store);
      return {
        sent: true,
        claimed: true,
        status: reconciled ? "Reconciliation Required" as const : "Reconciliation Persistence Failed" as const,
        messageSid,
      };
    }

    return {
      sent: true,
      claimed: true,
      status: "Notification Queued" as const,
      notificationStatus: providerStatus,
      messageSid,
    };
  } catch {
    const reconciled = await markReconciliation(store);
    return {
      sent: true,
      claimed: true,
      status: reconciled ? "Reconciliation Required" as const : "Reconciliation Persistence Failed" as const,
      error: "Vendor notification outcome is uncertain. Reconciliation is required before retry.",
    };
  }
}

async function markReconciliation(store: VendorNotificationStore) {
  try {
    await store.markReconciliationRequired();
    return true;
  } catch {
    return false;
  }
}
