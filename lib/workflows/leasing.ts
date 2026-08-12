import { textOnly } from "@/lib/workflows/email-intake-policy";

export function leasingAcknowledgement(input: { name?: string | null; property?: string | null }) {
  const firstName = input.name?.trim().split(/\s+/)[0] || "there";
  const property = input.property?.trim() ? ` about ${input.property.trim()}` : "";
  return `Hi ${firstName},\n\nThank you for contacting Legacy${property}. We received your inquiry and a member of our leasing team will follow up shortly.\n\nThank you,\nLegacy Leasing`;
}

export function requestsCallback(value: string | null | undefined) {
  return /\b(?:please\s+)?call\s+(?:me|us|back)|\bcallback\b|\breach me (?:by|at) phone\b/i.test(textOnly(value));
}

export function isLeasingClassification(value: string) { return value === "Lead/leasing inquiry"; }
