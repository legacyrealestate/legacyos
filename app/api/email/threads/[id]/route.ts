import { apiError, apiJson, ApiError } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const statuses = new Set(["Open", "Drafted", "Replied", "Closed", "Needs Review"]);

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser();
    const { id } = await context.params;
    const body = await req.json() as Record<string, unknown>;
    const db = createServiceSupabaseClient();
    const { data: thread } = await db.from("email_threads")
      .select("id,connection_id,provider_connections!inner(user_id,shared_with_staff)").eq("id", id).maybeSingle();
    if (!thread) throw new ApiError("not_found", "Email thread was not found.");
    const connection = thread.provider_connections as unknown as { user_id: string; shared_with_staff: boolean };
    if (connection.user_id !== auth.user.id && !connection.shared_with_staff) throw new ApiError("forbidden", "Email access denied.");
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if ("assignedTo" in body) {
      if (body.assignedTo !== null && typeof body.assignedTo !== "string") throw new ApiError("bad_request", "Invalid assignee.");
      if (body.assignedTo) {
        const { data: assignee } = await db.from("profiles").select("id").eq("id", body.assignedTo).eq("active", true).maybeSingle();
        if (!assignee) throw new ApiError("bad_request", "Assignee must be approved and active.");
      }
      update.assigned_to = body.assignedTo;
    }
    if (typeof body.internalNotes === "string") update.internal_notes = body.internalNotes.slice(0, 10_000);
    if (Array.isArray(body.tags)) update.tags = body.tags.filter((v): v is string => typeof v === "string").slice(0, 20).map(v => v.slice(0, 50));
    if (typeof body.automationDisabled === "boolean") update.automation_disabled = body.automationDisabled;
    if (typeof body.status === "string") {
      if (!statuses.has(body.status)) throw new ApiError("bad_request", "Invalid thread status.");
      update.status = body.status;
    }
    if (body.followUpAt === null || typeof body.followUpAt === "string") update.follow_up_at = body.followUpAt;
    const { data, error } = await db.from("email_threads").update(update).eq("id", id).select("*").single();
    if (error) throw new ApiError("server_error", "Unable to update email thread.");
    await db.from("audit_logs").insert({ actor_id: auth.user.id, action: "email.thread_updated", entity_type: "email_thread", entity_id: id, detail: { fields: Object.keys(update).filter(key => key !== "updated_at") } });
    return apiJson({ thread: data });
  } catch (error) { return apiError(error); }
}
