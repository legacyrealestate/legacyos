export function detectIntent(
  transcript: string
) {

  const text =
    transcript.toLowerCase();

  if (
    text.includes("leak") ||
    text.includes("maintenance") ||
    text.includes("flood") ||
    text.includes("hvac") ||
    text.includes("repair")
  ) {

    return "maintenance";

  }

  if (
    text.includes("rent") ||
    text.includes("tour") ||
    text.includes("apartment") ||
    text.includes("lease")
  ) {

    return "leasing";

  }

  if (
    text.includes("buy") ||
    text.includes("purchase") ||
    text.includes("mortgage")
  ) {

    return "sales";

  }

  if (
    text.includes("invest") ||
    text.includes("multifamily") ||
    text.includes("partnership")
  ) {

    return "investor";

  }

  return "general";
}