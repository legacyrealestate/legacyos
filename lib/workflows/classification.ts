const URGENCY_ORDER = ["Low", "Medium", "High", "Urgent", "Emergency"] as const;
export type Urgency = (typeof URGENCY_ORDER)[number];

const emergencyPatterns = [
  /\bfire\b/i,
  /\bsmoke\b/i,
  /\bgas (?:leak|odor|smell)\b/i,
  /\bcarbon monoxide\b/i,
  /\bflood(?:ing|ed)?\b/i,
  /\bactive (?:water )?leak\b/i,
  /\bno heat\b.*\b(?:freez|winter|cold)\b/i,
  /\belectrical (?:sparks?|fire|burning)\b/i,
  /\b(?:person|resident|tenant|child) (?:is )?(?:trapped|injured)\b/i,
  /\bbreak[- ]?in\b/i,
];

const urgentPatterns = [
  /\bwater leak\b/i,
  /\bno (?:power|electricity|heat|air conditioning|a\/?c)\b/i,
  /\bsewage\b/i,
  /\btoilet (?:overflow|backed up)\b/i,
  /\bcannot lock\b/i,
];

export function normalizeUrgency(value: unknown, context = ""): Urgency {
  const requested = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (["emergency", "critical", "life safety"].includes(requested)) return "Emergency";
  if (["urgent", "very high", "severe"].includes(requested)) return "Urgent";
  if (["high", "important"].includes(requested)) return "High";
  if (["low", "routine", "minor"].includes(requested)) return "Low";

  if (emergencyPatterns.some((pattern) => pattern.test(context))) return "Emergency";
  if (urgentPatterns.some((pattern) => pattern.test(context))) return "Urgent";
  return "Medium";
}

export function requiresHumanReview(input: { urgency: Urgency; text?: string | null }) {
  const text = input.text || "";
  return (
    input.urgency === "Emergency" ||
    input.urgency === "Urgent" ||
    /\b(?:lawyer|attorney|lawsuit|legal action|police|insurance claim|fair housing)\b/i.test(text) ||
    /\b(?:human|manager|supervisor|call me|speak to someone)\b/i.test(text)
  );
}

export function urgencyRank(urgency: string) {
  const index = URGENCY_ORDER.indexOf(urgency as Urgency);
  return index === -1 ? 1 : index;
}
