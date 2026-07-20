import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { autonomyMode, getIntegrationStates } from "@/lib/config/env";

export async function GET() {
  try {
    await requireUser();
    const supabase = createServiceSupabaseClient();
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const [calls, tickets, vendors, notifications, operations, emails, automations, contacts, properties] = await Promise.all([
      supabase.from("call_records").select("id,caller_name,category,urgency,emergency,status,summary,duration_seconds,started_at,created_at").gte("created_at", since).order("created_at", { ascending: false }),
      supabase.from("maintenance_tickets").select("id,tenant_name,property,issue,urgency,status,assigned_vendor_name,created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("vendors").select("id,name,trade,active,open_jobs").eq("active", true),
      supabase.from("notifications").select("id,acknowledged_at").is("acknowledged_at", null),
      supabase.from("operations_feed").select("id,type,title,description,created_at").order("created_at", { ascending: false }).limit(10),
      supabase.from("email_threads").select("id,status,urgency,last_message_at").order("last_message_at", { ascending: false }).limit(100),
      supabase.from("automation_runs").select("id,status,workflow,created_at").gte("created_at", since),
      supabase.from("crm_contacts").select("id", { count: "exact", head: true }),
      supabase.from("crm_properties").select("id", { count: "exact", head: true }),
    ]);
    for (const result of [calls, tickets, vendors, notifications, operations, emails, automations, contacts, properties]) {
      if (result.error) throw new ApiError("server_error", result.error.message);
    }

    const callRows = calls.data || [];
    const ticketRows = tickets.data || [];
    const emailRows = emails.data || [];
    const today = new Date().toISOString().slice(0, 10);
    const durations = callRows.map((call) => call.duration_seconds).filter((value): value is number => typeof value === "number");
    const callVolume = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(Date.now() - (6 - index) * 86400000).toISOString().slice(0, 10);
      return { date, count: callRows.filter((call) => (call.started_at || call.created_at || "").slice(0, 10) === date).length };
    });
    const openStatuses = new Set(["New", "Open", "Needs Review", "Vendor Recommended", "Vendor Approved", "Notification Queued", "Sent", "Delivered", "Failed", "In Progress", "Emergency Escalated"]);

    return apiJson({
      metrics: {
        callsToday: callRows.filter((call) => (call.started_at || call.created_at || "").slice(0, 10) === today).length,
        callsSevenDays: callRows.length,
        emergencies: ticketRows.filter((ticket) => ticket.urgency === "Emergency" && openStatuses.has(ticket.status)).length,
        openTickets: ticketRows.filter((ticket) => openStatuses.has(ticket.status)).length,
        averageCallSeconds: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0,
        activeVendors: vendors.data?.length || 0,
        unreadNotifications: notifications.data?.length || 0,
        openEmails: emailRows.filter((email) => !["Closed", "Replied"].includes(email.status)).length,
        contacts: contacts.count || 0,
        properties: properties.count || 0,
        automationSuccess: automations.data?.filter((run) => run.status === "completed").length || 0,
      },
      callVolume,
      urgentQueue: ticketRows.filter((ticket) => ["Emergency", "Urgent", "High"].includes(ticket.urgency) && openStatuses.has(ticket.status)).slice(0, 8),
      recentCalls: callRows.slice(0, 6),
      operations: operations.data || [],
      integrations: getIntegrationStates().map(({ id, label, configured }) => ({ id, label, configured })),
      autonomyMode: autonomyMode(),
    });
  } catch (error) {
    return apiError(error);
  }
}
