import { apiError } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { unavailable } from "@/lib/security/unavailable";

export async function GET() {
  try {
    await requireUser();
    return unavailable("leasing leads");
  } catch (error) {
    return apiError(error);
  }
}
