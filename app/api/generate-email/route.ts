import { apiError } from "@/lib/security/api";
import { requireAdmin } from "@/lib/security/auth";
import { POST as replyPOST } from "@/app/api/email/reply/route";

export async function POST() {
  try {
    await requireAdmin();
    return replyPOST();
  } catch (error) {
    return apiError(error);
  }
}
