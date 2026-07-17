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
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new ApiError("server_error", profileError.message);
  }

  if (!profile?.active) {
    throw new ApiError("forbidden", "Staff profile is inactive or missing.");
  }

  const role = profile.role === "admin" ? "admin" : "staff";
  return { user, role };
}

export async function requireAdmin() {
  const context = await requireUser();
  if (context.role !== "admin") {
    throw new ApiError("forbidden", "Admin access required.");
  }
  return context;
}
