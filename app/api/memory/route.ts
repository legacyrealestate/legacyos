import { apiError } from "@/lib/security/api";
import { requireAdmin } from "@/lib/security/auth";
import { unavailable } from "@/lib/security/unavailable";

export async function GET() {
  try {
    await requireAdmin();
    return unavailable("memory tables");
  } catch (error) {
    return apiError(error);
  }
}
