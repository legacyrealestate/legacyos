import { ApiError } from "./errors.ts";

export const TICKET_STATUSES = [
  "New",
  "Open",
  "Needs Review",
  "Vendor Recommended",
  "Vendor Approved",
  "Notification Queued",
  "Sent",
  "Delivered",
  "Failed",
  "In Progress",
  "Resolved",
  "Closed",
  "Emergency Escalated",
] as const;

export const DISPATCH_STATUSES = [
  "Recommended",
  "Approved",
  "Notification Queued",
  "Sent",
  "Delivered",
  "Failed",
  "Manually Contacted",
] as const;

export const DOCUMENT_CATEGORIES = [
  "Leasing",
  "Residents",
  "Owners",
  "Maintenance",
  "HOA",
  "Policies",
  "Accounting",
  "Legal",
] as const;

const E164 = /^\+[1-9]\d{1,14}$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertUuid(value: unknown, field = "id") {
  if (typeof value !== "string" || !UUID.test(value)) {
    throw new ApiError("bad_request", `Invalid ${field}.`);
  }
  return value;
}

export function assertE164(value: unknown, field = "phone") {
  if (typeof value !== "string" || !E164.test(value)) {
    throw new ApiError("bad_request", `Invalid ${field}. Use E.164 format.`);
  }
  return value;
}

export function assertString(value: unknown, field: string, max = 2000) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError("bad_request", `${field} is required.`);
  }

  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new ApiError("bad_request", `${field} is too long.`);
  }
  return trimmed;
}

export function assertOptionalString(value: unknown, field: string, max = 1000) {
  if (value === undefined || value === null || value === "") return null;
  return assertString(value, field, max);
}

export function assertOneOf<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new ApiError("bad_request", `Invalid ${field}.`);
  }
  return value as T[number];
}

export function safeJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError("bad_request", "Expected a JSON object.");
  }
  return value as Record<string, unknown>;
}

export function safeFilename(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  if (!cleaned || cleaned === "." || cleaned === "..") {
    throw new ApiError("bad_request", "Invalid file name.");
  }
  return cleaned.slice(0, 180);
}

export function isAllowedDocumentType(file: File) {
  return [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ].includes(file.type);
}
