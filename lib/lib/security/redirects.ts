export function safeRelativeRedirect(value: string | null | undefined) {
  if (!value) return "/";

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  if (decoded.includes("\\") || decoded.includes("\u0000")) return null;

  try {
    const parsed = new URL(decoded, "https://legacyos.local");
    if (parsed.origin !== "https://legacyos.local") return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
