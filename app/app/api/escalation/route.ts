import { apiError } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { POST as escalatePOST } from "@/app/api/escalate/route";

export async function POST(req: Request) {
  try {
    await requireUser();
    return escalatePOST(req);
  } catch (error) {
    return apiError(error);
  }
}
