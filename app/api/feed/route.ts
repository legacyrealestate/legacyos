import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    await requireUser();
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("operations_feed")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new ApiError("server_error", error.message);
    return apiJson(data || []);
  } catch (error) {
    return apiError(error);
  }
}
