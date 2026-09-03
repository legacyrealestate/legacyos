import crypto from "node:crypto";

export const ACTIVE_VENDOR_JOB_STATUSES = [
  "Approved",
  "Notification Queued",
  "Sent",
  "Delivered",
  "Manually Contacted",
  "Reconciliation Required",
] as const;

export const PROVIDER_CONTROLLED_TICKET_STATUSES = [
  "Notification Queued",
  "Sent",
  "Delivered",
] as const;

export const STAFF_TICKET_STATUSES = [
  "New",
  "Open",
  "Needs Review",
  "Vendor Recommended",
  "In Progress",
  "Resolved",
  "Closed",
  "Failed",
] as const;

export type VendorJobStatus =
  | "Recommended"
  | "Approved"
  | "Notification Queued"
  | "Sent"
  | "Delivered"
  | "Failed"
  | "Manually Contacted"
  | "Closed"
  | "Reconciliation Required";

export type TicketDispatchStatus =
  | "Recommended"
  | "Approved"
  | "Notification Disabled"
  | "Notification Queued"
  | "Sent"
  | "Delivered"
  | "Failed"
  | "Manually Contacted";

export type TwilioProviderStatus =
  | "queued"
  | "accepted"
  | "scheduled"
  | "sending"
  | "sent"
  | "delivered"
  | "failed"
  | "undelivered"
  | "canceled";

const STATUS_RANK: Record<TicketDispatchStatus, number> = {
  Recommended: 0,
  Approved: 1,
  "Notification Disabled": 1,
  "Notification Queued": 2,
  Sent: 3,
  Delivered: 4,
  Failed: 4,
  "Manually Contacted": 4,
};

export function isTicketDispatchStatus(value: unknown): value is TicketDispatchStatus {
  return typeof value === "string" && value in STATUS_RANK;
}

export function createDispatchKey() {
  return crypto.randomUUID();
}

export function mapTwilioStatus(status: string): TicketDispatchStatus | null {
  if (["queued", "accepted", "scheduled", "sending"].includes(status)) {
    return "Notification Queued";
  }
  if (status === "sent") return "Sent";
  if (status === "delivered") return "Delivered";
  if (["failed", "undelivered", "canceled"].includes(status)) return "Failed";
  return null;
}

export function monotonicDispatchStatus(
  current: TicketDispatchStatus | null | undefined,
  next: TicketDispatchStatus | null
) {
  if (!next) return current || null;
  if (!current) return next;
  if (next === current) return current;
  return STATUS_RANK[next] > STATUS_RANK[current] ? next : current;
}

export function canChangeVendorBeforeExternalAttempt(job: {
  provider_message_sid?: string | null;
  notification_status?: string | null;
  status?: string | null;
}) {
  return (
    !job.provider_message_sid &&
    !["Sending", "sent", "queued", "accepted", "scheduled", "delivered", "failed", "undelivered", "canceled"].includes(
      job.notification_status || ""
    ) &&
    job.status !== "Notification Queued" &&
    job.status !== "Sent" &&
    job.status !== "Delivered" &&
    job.status !== "Failed" &&
    job.status !== "Manually Contacted" &&
    job.status !== "Closed" &&
    job.status !== "Reconciliation Required"
  );
}

export function shouldBlockExternalRetry(job: {
  provider_message_sid?: string | null;
  notification_attempt_key?: string | null;
  notification_status?: string | null;
  status?: string | null;
}) {
  return Boolean(
    job.provider_message_sid ||
      job.notification_attempt_key ||
      job.notification_status === "Sending" ||
      job.status === "Notification Queued" ||
      job.status === "Sent" ||
      job.status === "Delivered" ||
      job.status === "Manually Contacted" ||
      job.status === "Closed" ||
      job.status === "Reconciliation Required"
  );
}

export function isStaffControlledTicketStatus(status: string) {
  return (STAFF_TICKET_STATUSES as readonly string[]).includes(status);
}

export function applyVendorCallbackTransition({
  jobStatus,
  ticketStatus,
  providerStatus,
}: {
  jobStatus: TicketDispatchStatus | null;
  ticketStatus: TicketDispatchStatus | null;
  providerStatus: string;
}) {
  const mapped = mapTwilioStatus(providerStatus);
  if (!mapped) {
    return { jobStatus, ticketStatus, ignored: true };
  }

  return {
    jobStatus: monotonicDispatchStatus(jobStatus, mapped),
    ticketStatus: monotonicDispatchStatus(ticketStatus, mapped),
    ignored: false,
  };
}
