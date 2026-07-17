import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    await requireUser();
    const supabase = createServiceSupabaseClient();

    const [callsResult, vendorsResult, notificationsResult, operationsResult] =
      await Promise.all([
        supabase.from("maintenance_tickets").select("*"),
        supabase.from("vendors").select("*").eq("active", true),
        supabase.from("notifications").select("*"),
        supabase
          .from("operations_feed")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

    for (const result of [callsResult, vendorsResult, notificationsResult, operationsResult]) {
      if (result.error) throw new ApiError("server_error", result.error.message);
    }

    const calls = callsResult.data || [];
    const emergencyCount = calls.filter((call) => call.urgency === "Emergency").length;
    const escalatedCount = calls.filter((call) => call.status?.includes("Escalated")).length;

    return apiJson({
      metrics: {
        totalCalls: calls.length,
        emergencies: emergencyCount,
        escalated: escalatedCount,
        vendors: vendorsResult.data?.length || 0,
        notifications: notificationsResult.data?.length || 0,
      },
      operations: operationsResult.data || [],
      vendors: vendorsResult.data || [],
      calls,
    });
  } catch (error) {
    return apiError(error);
  }
}
