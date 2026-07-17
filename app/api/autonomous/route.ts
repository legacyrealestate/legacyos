import { apiError } from "@/lib/security/api";
import { requireAdmin } from "@/lib/security/auth";
import { unavailable } from "@/lib/security/unavailable";

export async function POST() {
  try {
    await requireAdmin();
    return unavailable("automated operational actions");
  } catch (error) {
    return apiError(error);
  }
}
