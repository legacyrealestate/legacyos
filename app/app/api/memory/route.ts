import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireAdmin } from "@/lib/security/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from("command_memory").select("id,prompt,response,metadata,created_at").order("created_at", { ascending: false }).limit(100);
    if (error) throw new ApiError("server_error", error.message);
    return apiJson(data || []);
  } catch (error) {
    return apiError(error);
  }
}
