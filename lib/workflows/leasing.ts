import { textOnly } from "@/lib/workflows/email-intake-policy";

export type LeasingDetails = {
  moveInDate: string | null;
  bedrooms: string | null;
  budget: { min: number | null; max: number | null };
  missing: string[];
};

export function leasingAcknowledgement(input: { name?: string | null; property?: string | null }) {
  const firstName = input.name?.trim().split(/\s+/)[0] || "there";
  const property = input.property?.trim() ? ` about ${input.property.trim()}` : "";
  return `Hi ${firstName},\n\nThank you for contacting Legacy${property}. We received your inquiry and a member of our leasing team will follow up shortly.\n\nThank you,\nLegacy Leasing`;
}

export function extractLeasingDetails(value: string | null | undefined): LeasingDetails {
  const text = textOnly(value);
  const bedrooms = text.match(/\b(?:studio|[1-9]\s*(?:bed|bedroom|br))\b/i)?.[0]?.replace(/\s+/g, " ") || null;
  const date = text.match(/\b(?:move(?:\s|-)?in|available|start)(?:\s+(?:date|around|by|on))?\s*[:,-]?\s*((?:\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[a-z]*\s+\d{0,2}(?:,?\s*\d{4})?)/i)?.[1] || null;
  const range = text.match(/\$\s*([\d,]{3,6})\s*(?:-|to)\s*\$?\s*([\d,]{3,6})/);
  const maximum = text.match(/\b(?:budget|under|up to|max(?:imum)?)\s*(?:is|of|:)?\s*\$?\s*([\d,]{3,6})/i);
  const budget = { min: range ? Number(range[1].replace(/,/g, "")) : null, max: range ? Number(range[2].replace(/,/g, "")) : maximum ? Number(maximum[1].replace(/,/g, "")) : null };
  const missing = [bedrooms ? null : "bedroom preference", date ? null : "move-in timing", budget.max || budget.min ? null : "budget"].filter((item): item is string => Boolean(item));
  return { moveInDate: date, bedrooms, budget, missing };
}

export function leasingInformationRequest(input: { name?: string | null; missing: string[] }) {
  const firstName = input.name?.trim().split(/\s+/)[0] || "there";
  const details = input.missing.length ? input.missing.join(", ") : "your preferred home details";
  return `Hi ${firstName},\n\nThank you for reaching out to Legacy Leasing. To help our team send the most relevant options, could you share your ${details}, along with the best phone number for a follow-up?\n\nOnce we have that, a member of our leasing team will follow up.\n\nThank you,\nLegacy Leasing`;
}

export function requestsCallback(value: string | null | undefined) {
  return /\b(?:please\s+)?call\s+(?:me|us|back)|\bcallback\b|\breach me (?:by|at) phone\b/i.test(textOnly(value));
}

export function isLeasingClassification(value: string) { return value === "Lead/leasing inquiry"; }
