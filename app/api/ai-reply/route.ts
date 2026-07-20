import { apiError } from "@/lib/security/api";
import { requireAdmin } from "@/lib/security/auth";
import { POST as replyPOST } from "@/app/api/email/reply/route";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    return replyPOST(req);
  } catch (error) {
    return apiError(error);
  }
}
