import { textOnly } from "@/lib/workflows/email-intake-policy";

export type LeasingDetails = {
  moveInDate: string | null;
  bedrooms: string | null;
  budget: { min: number | null; max: number | null };
  missing: string[];
};

export type LeadTemperature = "Hot" | "Warm" | "Cold";
export type LeadQualification = { score: number; temperature: LeadTemperature; reasons: string[] };

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

export function scoreLeasingLead(input: { text: string | null | undefined; details: LeasingDetails; phone?: string | null; property?: string | null }) : LeadQualification {
  const text = textOnly(input.text).toLowerCase();
  const reasons: string[] = [];
  let score = 10;
  const add = (value: number, reason: string) => { score += value; reasons.push(reason); };

  if (requestsCallback(text)) add(30, "Requested a callback");
  if (/\b(?:tour|showing|view|visit|schedule)\b/.test(text)) add(25, "Asked about a tour or showing");
  if (input.phone) add(15, "Provided a phone number");
  if (input.property) add(10, "Referenced a property");
  if (input.details.moveInDate) add(10, "Provided move-in timing");
  if (input.details.bedrooms) add(5, "Provided bedroom preference");
  if (input.details.budget.min || input.details.budget.max) add(5, "Provided a budget");

  score = Math.min(100, score);
  const temperature: LeadTemperature = score >= 60 ? "Hot" : score >= 30 ? "Warm" : "Cold";
  return { score, temperature, reasons: reasons.length ? reasons : ["Initial leasing inquiry"] };
}
