import { apiJson } from "@/lib/security/api";

export function unavailable(feature: string) {
  return apiJson(
    {
      success: false,
      available: false,
      error: `${feature} is not connected for the supervised pilot.`,
    },
    { status: 501 }
  );
}
