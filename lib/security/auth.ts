import type { User } from "@supabase/supabase-js";
import { ApiError } from "@/lib/security/api";
import {
  createServiceSupabaseClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export type StaffRole = "admin" | "staff";

export type AuthContext = {
  user: User;
  role: StaffRole;
};

function emailSet(name: string) {
  return new Set((process.env[name] || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export function approvedRole(email: string | undefined): StaffRole | null {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;
  if (emailSet("LEGACY_ADMIN_EMAILS").has(normalized)) return "admin";
  if (emailSet("LEGACY_STAFF_EMAILS").has(normalized)) return "staff";
  return null;
}

export async function requireUser(): Promise<AuthContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new ApiError("unauthorized", "Authentication required.");
  }

  const service = createServiceSupabaseClient();
  const profileResult = await service
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .maybeSingle();
  let profile = profileResult.data;
  const profileError = profileResult.error;

  if (profileError) {
    if (profileError.code === "42P01" || profileError.code === "PGRST205") {
      throw new ApiError("missing_migration", "Staff profile migration has not been applied.");
    }
    throw new ApiError("server_error", "Unable to verify staff profile.");
  }

  const role = approvedRole(user.email);
  if (!profile && role) {
    const repaired = await service.from("profiles").upsert({ id: user.id, role, active: true }, { onConflict: "id" }).select("role, active").single();
    if (repaired.error) throw new ApiError("server_error", "Unable to repair approved staff profile.");
    profile = repaired.data;
  }

  if (!profile) {
    throw new ApiError("profile_pending", "Your staff profile is pending administrator approval.");
  }
  if (!profile.active) {
    throw new ApiError("profile_inactive", "Your staff profile is inactive. Contact an administrator.");
  }

  return { user, role: profile.role === "admin" ? "admin" : "staff" };
}

export async function requireAdmin() {
  const context = await requireUser();
  if (context.role !== "admin") {
    throw new ApiError("forbidden", "Admin access required.");
  }
  return context;
}
