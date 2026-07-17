import { apiError } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { GET as dashboardGET } from "@/app/api/dashboard/route";

export async function GET() {
  try {
    await requireUser();
    return dashboardGET();
  } catch (error) {
    return apiError(error);
  }
}
