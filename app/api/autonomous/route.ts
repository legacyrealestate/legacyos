import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireAdmin } from "@/lib/security/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { autonomyMode } from "@/lib/config/env";

export async function POST() {
  try {
    await requireAdmin();
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from("automation_runs").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) throw new ApiError("server_error", error.message);
    return apiJson({ mode: autonomyMode(), runs: data || [] });
  } catch (error) {
    return apiError(error);
  }
}
