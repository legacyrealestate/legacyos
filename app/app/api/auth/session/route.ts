import { apiError, apiJson, ApiError } from "@/lib/security/api";
import { approvedRole } from "@/lib/security/auth";
import { createServiceSupabaseClient, createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const auth = await createSupabaseServerClient();
    const { data: { user }, error } = await auth.auth.getUser();
    if (error || !user) throw new ApiError("unauthorized", "Authentication required.");
    const db = createServiceSupabaseClient();
    const { data: profile, error: profileError } = await db.from("profiles").select("full_name,role,active").eq("id", user.id).maybeSingle();
    if (profileError) throw new ApiError(profileError.code === "42P01" ? "missing_migration" : "server_error", "Unable to load account profile.");
    const allowlistedRole = approvedRole(user.email);
    return apiJson({
      id: user.id,
      email: user.email || "",
      name: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "LegacyOS user",
      role: profile?.role || allowlistedRole || "staff",
      active: profile?.active === true,
      profileStatus: !profile ? "pending" : profile.active ? "active" : "inactive",
      approved: Boolean(profile?.active && (profile.role === "admin" || profile.role === "staff")),
    });
  } catch (error) { return apiError(error); }
}
