import { apiError, apiJson } from "@/lib/security/api";
import { requireAdmin } from "@/lib/security/auth";
import { syncElevenLabs } from "@/lib/providers/elevenlabs";
import { requireCron } from "@/lib/security/cron";

export async function POST() {
  try { await requireAdmin(); return apiJson({ success: true, ...(await syncElevenLabs()) }); }
  catch (error) { return apiError(error); }
}
export async function GET(req: Request) {
  try {
    requireCron(req);
    return apiJson({ success: true, ...(await syncElevenLabs()) });
  } catch (error) { return apiError(error); }
}
