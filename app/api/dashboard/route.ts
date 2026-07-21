import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    await requireUser();
    const supabase = createServiceSupabaseClient();

    const [callsResult, vendorsResult, notificationsResult, operationsResult, emailResult, connectionsResult, jobsResult] =
      await Promise.all([
        supabase.from("maintenance_tickets").select("*"),
        supabase.from("vendors").select("*").eq("active", true),
        supabase.from("notifications").select("*"),
        supabase
          .from("operations_feed")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase.from("email_threads").select("id,status,last_message_at"),
        supabase.from("provider_connections").select("provider,status,last_success_at,last_sync_at,last_error"),
        supabase.from("alma_jobs").select("status,run_after,updated_at"),
      ]);

    for (const result of [callsResult, vendorsResult, notificationsResult, operationsResult, emailResult, connectionsResult, jobsResult]) {
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
        emailQueue: (emailResult.data || []).filter((item) => item.status === "open").length,
        workerQueued: (jobsResult.data || []).filter((item) => ["queued","retry"].includes(item.status)).length,
        workerDeadLetter: (jobsResult.data || []).filter((item) => item.status === "dead_letter").length,
      },
      operations: operationsResult.data || [],
      vendors: vendorsResult.data || [],
      calls,
      integrations: connectionsResult.data || [],
      worker: { jobs: jobsResult.data || [], nextScheduledAt: (jobsResult.data || []).filter((item) => ["queued","retry"].includes(item.status)).map((item) => item.run_after).sort()[0] || null },
    });
  } catch (error) {
    return apiError(error);
  }
}
