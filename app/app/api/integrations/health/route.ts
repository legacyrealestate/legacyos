import { apiError, apiJson } from "@/lib/security/api";
import { requireAdmin } from "@/lib/security/auth";
import { autonomyMode, emailAutoreplyMode, getIntegrationStates } from "@/lib/config/env";

export async function GET() {
  try {
    await requireAdmin();
    return apiJson({
      integrations: getIntegrationStates(),
      autonomyMode: autonomyMode(),
      emailAutoreplyMode: emailAutoreplyMode(),
      outboundCommunications: process.env.ENABLE_OUTBOUND_COMMUNICATIONS === "true",
    });
  } catch (error) {
    return apiError(error);
  }
}
