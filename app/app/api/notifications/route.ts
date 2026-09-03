import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { assertUuid, safeJsonObject } from "@/lib/security/validation";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    await requireUser();
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new ApiError("server_error", error.message);
    return apiJson(data || []);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireUser();
    const body = safeJsonObject(await req.json());
    const notificationId = assertUuid(body.notificationId, "notificationId");
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("notifications")
      .update({
        read_at: new Date().toISOString(),
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: auth.user.id,
      })
      .eq("id", notificationId)
      .select()
      .single();

    if (error) throw new ApiError("server_error", error.message);
    return apiJson({ success: true, notification: data });
  } catch (error) {
    return apiError(error);
  }
}
