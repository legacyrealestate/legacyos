import { apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { autonomyMode, getIntegrationStates } from "@/lib/config/env";

export async function GET() {
  try {
    await requireUser();
    return apiJson({ ready: getIntegrationStates().find((item) => item.id === "supabase")?.configured || false, autonomyMode: autonomyMode() });
  } catch (error) {
    return apiError(error);
  }
}
