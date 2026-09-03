import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireAdmin } from "@/lib/security/auth";
import { assertUuid } from "@/lib/security/validation";
import { indexKnowledgeSource, KNOWLEDGE_BUCKET } from "@/lib/knowledge";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    return apiJson({ success: true, ...(await indexKnowledgeSource(assertUuid(id, "knowledge source ID"))) });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const sourceId = assertUuid(id, "knowledge source ID");
    const db = createServiceSupabaseClient();
    const { data: source, error } = await db.from("knowledge_sources").select("storage_path").eq("id", sourceId).single();
    if (error || !source) throw new ApiError("not_found", "Knowledge source not found.");
    const removed = await db.storage.from(KNOWLEDGE_BUCKET).remove([source.storage_path]);
    if (removed.error) throw new ApiError("server_error", removed.error.message);
    const deleted = await db.from("knowledge_sources").delete().eq("id", sourceId);
    if (deleted.error) throw new ApiError("server_error", "Unable to delete the knowledge source.");
    return apiJson({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
