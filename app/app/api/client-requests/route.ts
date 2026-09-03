import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { assertOptionalString, assertString, safeJsonObject } from "@/lib/security/validation";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    await requireUser();
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("client_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new ApiError("server_error", error.message);
    return apiJson({ success: true, requests: data || [] });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    const body = safeJsonObject(await req.json());
    const supabase = createServiceSupabaseClient();

    const { data, error } = await supabase
      .from("client_requests")
      .insert({
        title: assertString(body.title, "title", 160),
        description: assertOptionalString(body.description, "description", 2000) || "",
        category: assertOptionalString(body.category, "category", 80) || "General",
        priority: assertOptionalString(body.priority, "priority", 40) || "Medium",
        status: assertOptionalString(body.status, "status", 40) || "Requested",
        requested_by: assertOptionalString(body.requested_by, "requested by", 120),
        notes: assertOptionalString(body.notes, "notes", 2000),
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (error) throw new ApiError("server_error", error.message);
    return apiJson({ success: true, request: data }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
