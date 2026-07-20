import { apiError, apiJson } from "@/lib/security/api";
import { requireAdmin } from "@/lib/security/auth";
import { assertString, safeJsonObject } from "@/lib/security/validation";
import { generateAlmaResponse } from "@/lib/ai/alma";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = safeJsonObject(await req.json());
    const transcript = assertString(body.transcript || body.message, "transcript", 20000);
    const result = await generateAlmaResponse({
      message: "Analyze this call transcript. Return urgency, category, concise summary, risks, and the next staff action.",
      context: { transcript },
    });
    return apiJson({ success: true, analysis: result.text });
  } catch (error) {
    return apiError(error);
  }
}
