import { apiError, apiJson, ApiError } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import {
  requestEmailAction,
  approveEmailAction,
  type ComposeInput,
} from "@/lib/providers/email-compose";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireUser();
    if (process.env.ENABLE_STAFF_EMAIL_SEND !== "true") {
      throw new ApiError(
        "forbidden",
        "Staff email sending is disabled. Set ENABLE_STAFF_EMAIL_SEND=true in Vercel before sending.",
      );
    }
    const { id } = await context.params;
    const body = (await req.json()) as Partial<ComposeInput>;
    const action =
      body.action === "reply_all" ||
      body.action === "forward" ||
      body.action === "send"
        ? body.action
        : "reply";
    if (!body.body?.trim())
      throw new ApiError("bad_request", "A reply body is required.");
    const created = await requestEmailAction(auth.user.id, id, {
      action,
      to: Array.isArray(body.to) ? body.to : [],
      cc: Array.isArray(body.cc) ? body.cc : [],
      subject: String(body.subject || ""),
      body: body.body.trim(),
      idempotencyKey: String(body.idempotencyKey || ""),
    });
    const actionId =
      created.actionId ||
      ("action" in created && created.action ? created.action.id : null);
    if (!actionId)
      throw new ApiError("server_error", "Unable to prepare this email send.");
    return apiJson(await approveEmailAction(actionId, auth.user.id));
  } catch (error) {
    return apiError(error);
  }
}
