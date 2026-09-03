import { apiError, apiJson, ApiError } from "@/lib/security/api";
import { requireAdmin } from "@/lib/security/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    const { id } = await context.params;
    const body = await req.json() as { action?: string; reason?: string };
    if (body.action !== "reject" || !body.reason?.trim()) throw new ApiError("bad_request", "A rejection reason is required.");
    const db = createServiceSupabaseClient();
    const { data, error } = await db.from("email_outbound_actions").update({ status: "rejected", last_error: body.reason.slice(0, 500), updated_at: new Date().toISOString() }).eq("id", id).in("status", ["waiting_approval", "draft", "approved"]).select("id,source_message_id").maybeSingle();
    if (error) throw new ApiError("server_error", "Unable to reject email action.");
    if (!data) throw new ApiError("conflict", "Email action can no longer be rejected.");
    await db.from("audit_logs").insert({ actor_id: auth.user.id, action: "email.action_rejected", entity_type: "email_action", detail: { actionId: id, reason: body.reason.slice(0, 500) } });
    return apiJson({ success: true });
  } catch (error) { return apiError(error); }
}
