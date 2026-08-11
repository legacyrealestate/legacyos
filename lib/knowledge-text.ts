const CHUNK_SIZE = 2800;
const CHUNK_OVERLAP = 320;

const supportedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const supportedExtensions = /\.(pdf|docx|xlsx|txt|md|markdown|csv|json|jpe?g|png|webp)$/i;

export type KnowledgeClassification = {
  category: string;
  topics: string[];
  confidence: number;
  suggestedDestination: string;
};

const classificationRules = [
  { category: "Maintenance", destination: "Maintenance review queue", keywords: ["maintenance", "repair", "work order", "leak", "plumbing", "hvac", "electrical", "pest", "mold", "appliance"] },
  { category: "Vendors", destination: "Vendor directory review", keywords: ["vendor", "contractor", "dispatch", "insurance", "w-9", "plumber", "electrician", "landscaping", "invoice"] },
  { category: "Residents", destination: "Resident/contact review", keywords: ["resident", "tenant", "leaseholder", "unit", "move-in", "move out", "occupant"] },
  { category: "Owners", destination: "Owner/property review", keywords: ["owner", "ownership", "owner statement", "distribution", "property owner"] },
  { category: "Leasing", destination: "Leasing review queue", keywords: ["leasing", "prospect", "tour", "application", "available", "rent", "showing"] },
  { category: "Accounting", destination: "Accounting review queue", keywords: ["accounting", "payment", "balance", "ledger", "invoice", "deposit", "rent roll", "reconciliation"] },
  { category: "Legal", destination: "Policy/legal review", keywords: ["legal", "notice", "eviction", "fair housing", "attorney", "court", "compliance"] },
  { category: "Policies", destination: "Operating policy library", keywords: ["policy", "procedure", "sop", "standard", "guideline", "approval", "emergency procedure"] },
  { category: "Operations", destination: "Operations knowledge library", keywords: ["operations", "workflow", "schedule", "checklist", "inspection", "process", "handoff"] },
] as const;

export function isKnowledgeFileType(file: File) {
  return supportedMimeTypes.has(file.type) || supportedExtensions.test(file.name);
}

export function knowledgeMimeType(file: Pick<File, "name" | "type">) {
  if (supportedMimeTypes.has(file.type)) return file.type;
  const extension = file.name.toLowerCase().split(".").pop();
  return ({
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    txt: "text/plain", md: "text/markdown", markdown: "text/markdown",
    csv: "text/csv", json: "application/json", jpg: "image/jpeg", jpeg: "image/jpeg",
    png: "image/png", webp: "image/webp",
  } as Record<string, string>)[extension || ""] || "application/octet-stream";
}

export function classifyKnowledgeText(title: string, value: string): KnowledgeClassification {
  const searchable = `${title}\n${value.slice(0, 24000)}`.toLowerCase();
  const scored = classificationRules.map((rule) => {
    const matches = rule.keywords.filter((keyword) => searchable.includes(keyword));
    return { ...rule, matches, score: matches.length };
  }).sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score === 0) {
    return { category: "Operations", topics: [], confidence: 0.2, suggestedDestination: "Operations knowledge library" };
  }
  return {
    category: best.category,
    topics: best.matches.slice(0, 6),
    confidence: Math.min(0.95, 0.36 + best.score * 0.18),
    suggestedDestination: best.destination,
  };
}

function normalizeText(value: string) {
  return value.replace(/\u0000/g, "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function chunkKnowledgeText(value: string) {
  const text = normalizeText(value);
  if (!text) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + CHUNK_SIZE);
    if (end < text.length) {
      const boundary = Math.max(text.lastIndexOf("\n", end), text.lastIndexOf(". ", end));
      if (boundary > start + Math.floor(CHUNK_SIZE * 0.55)) end = boundary + 1;
    }
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= text.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }
  return chunks;
}
