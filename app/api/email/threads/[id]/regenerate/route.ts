import { apiError, apiJson, ApiError } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { enqueueAlma } from "@/lib/workflows/alma";

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(); const { id } = await context.params; const db = createServiceSupabaseClient();
    const { data } = await db.from("email_threads").select("id,connection_id,provider_connections!inner(user_id,shared_with_staff)").eq("id", id).maybeSingle();
    if (!data) throw new ApiError("not_found", "Email thread was not found.");
    const connection = data.provider_connections as unknown as { user_id: string; shared_with_staff: boolean };
    if (connection.user_id !== auth.user.id && !connection.shared_with_staff) throw new ApiError("forbidden", "Email access denied.");
    const job = await enqueueAlma({ jobType: "email_analysis", entityType: "email_thread", entityId: id, payload: { action: "regenerate_draft", requestedBy: auth.user.id }, idempotencyKey: `email-regenerate:${id}:${Date.now()}` });
    await db.from("audit_logs").insert({ actor_id: auth.user.id, action: "email.draft_regeneration_requested", entity_type: "email_thread", entity_id: id, detail: {} });
    return apiJson({ success: true, job });
  } catch (error) { return apiError(error); }
}
