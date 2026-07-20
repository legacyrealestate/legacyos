import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireAdmin } from "@/lib/security/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    await requireAdmin();
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from("automation_runs").select("*").in("status", ["started", "needs_review", "failed"]).order("created_at", { ascending: false }).limit(100);
    if (error) throw new ApiError("server_error", error.message);
    return apiJson({ queue: data || [] });
  } catch (error) {
    return apiError(error);
  }
}
