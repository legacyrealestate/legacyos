import { apiError } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { unavailable } from "@/lib/security/unavailable";

export async function POST() {
  try {
    await requireUser();
    return unavailable("legacy direct dispatch");
  } catch (error) {
    return apiError(error);
  }
}
