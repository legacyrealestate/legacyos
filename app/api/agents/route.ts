import { apiError } from "@/lib/security/api";
import { requireAdmin } from "@/lib/security/auth";
import { POST as almaPOST } from "@/app/api/alma/chat/route";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    return almaPOST(req);
  } catch (error) {
    return apiError(error);
  }
}
