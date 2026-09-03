export type VendorRecord = {
  id: string;
  name: string;
  trade?: string | null;
  coverage_trades?: string[] | null;
  phone?: string | null;
  email?: string | null;
  alternate_email?: string | null;
  dispatch_keywords?: string[] | null;
  priority?: string | null;
  emergency_available?: boolean | null;
  active?: boolean | null;
  dispatch_order?: number | null;
  open_jobs?: number | null;
  total_dispatched?: number | null;
  last_dispatched_at?: string | null;
};

export function scoreVendor(vendor: VendorRecord, text: string) {
  const lower = text.toLowerCase();
  let score = 0;

  for (const keyword of vendor.dispatch_keywords || []) {
    if (lower.includes(String(keyword).toLowerCase())) score += 10;
  }

  if (vendor.priority === "Preferred") score += 5;
  if (vendor.emergency_available) score += 3;
  if (vendor.active === false) score -= 100;
  score -= Math.min(vendor.open_jobs || 0, 10);

  return score;
}

export function rankVendors(vendors: VendorRecord[], text: string) {
  return vendors
    .filter((vendor) => vendor.active !== false)
    .map((vendor) => ({
      ...vendor,
      score: scoreVendor(vendor, text),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.dispatch_order || Number.MAX_SAFE_INTEGER) - (b.dispatch_order || Number.MAX_SAFE_INTEGER) ||
        a.name.localeCompare(b.name)
    );
}
