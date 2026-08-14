import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const dayKey = (value: string) => new Date(value).toISOString().slice(0, 10);

export async function GET() {
  try {
    const auth = await requireUser();
    const db = createServiceSupabaseClient();
    const [calls, operations, emails, actions, connections, jobs, checkpoints, leasingLeads] = await Promise.all([
      db.from("maintenance_tickets").select("id,tenant_name,phone,property,urgency,status,classification,classification_reason,direction,call_status,call_started_at,created_at,ai_summary,follow_up_status,crm_tasks(id,status,title,due_at)").order("created_at", { ascending: false }),
      db.from("operations_feed").select("id,type,title,description,related_ticket_id,created_at").order("created_at", { ascending: false }).limit(10),
      db.from("email_threads").select("id,subject,status,urgency,assigned_to,last_message_at,follow_up_at,alma_classification,automation_disabled").order("last_message_at", { ascending: false }),
      db.from("email_outbound_actions").select("id,status,action,created_at,source_message_id").order("created_at", { ascending: false }),
      db.from("provider_connections").select("provider,account_email,status,last_success_at,last_sync_at,last_error,shared_with_staff").or(`shared_with_staff.eq.true,user_id.eq.${auth.user.id}`),
      db.from("alma_jobs").select("id,status,job_type,run_after,updated_at,last_error").order("updated_at", { ascending: false }),
      db.from("sync_checkpoints").select("provider,last_success_at,last_error,checkpoint").order("last_success_at", { ascending: false }),
      db.from("email_leads").select("id,status,desired_property,unit_type,next_follow_up_at,created_at,email_threads!inner(id,subject,primary_classification,crm_contacts(full_name,email,phone))").order("created_at", { ascending: false }).limit(20),
    ]);
    for (const result of [calls, operations, emails, actions, connections, jobs, checkpoints, leasingLeads]) {
      if (result.error) throw new ApiError(result.error.code === "42P01" ? "missing_migration" : "server_error", result.error.message);
    }

    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const week = new Date(today); week.setDate(week.getDate() - 6);
    const callRows = calls.data || [], emailRows = emails.data || [], actionRows = actions.data || [], jobRows = jobs.data || [];
    const leadRows = (leasingLeads.data || []).flatMap((lead) => {
      const thread = Array.isArray(lead.email_threads) ? lead.email_threads[0] : lead.email_threads;
      return thread?.primary_classification === "Lead/leasing inquiry" ? [{ ...lead, email_threads: thread }] : [];
    });
    const callDate = (call: (typeof callRows)[number]) => new Date(call.call_started_at || call.created_at);
    const normalizedDirection = (call: (typeof callRows)[number]) => String(call.direction || "unknown").toLowerCase();
    const followUpOpen = (call: (typeof callRows)[number]) => call.follow_up_status && !["none", "completed"].includes(call.follow_up_status) || call.crm_tasks?.some(task => !["completed", "closed"].includes(task.status));
    const urgencyCounts = ["Emergency", "Urgent", "High", "Medium", "Low"].map(label => ({ label, value: callRows.filter(call => call.urgency === label).length }));
    const volume = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(week); date.setDate(week.getDate() + index);
      const key = dayKey(date.toISOString());
      return { date: key, label: date.toLocaleDateString("en-US", { weekday: "short" }), value: callRows.filter(call => dayKey(callDate(call).toISOString()) === key).length };
    });
    const eleven = (checkpoints.data || []).find(row => row.provider === "elevenlabs");
    const emailCheckpoint = (checkpoints.data || []).filter(row => row.provider === "google" || row.provider === "microsoft").map(row => row.last_success_at).filter(Boolean).sort().at(-1) || null;
    const awaitingApproval = actionRows.filter(row => row.status === "waiting_approval");
    const emailQueue = emailRows.filter(row => !["Replied", "Closed"].includes(row.status));

    return apiJson({
      metrics: {
        callsToday: callRows.filter(call => callDate(call) >= today).length,
        callsWeek: callRows.filter(call => callDate(call) >= week).length,
        inboundCalls: callRows.filter(call => normalizedDirection(call) === "inbound").length,
        outboundCalls: callRows.filter(call => normalizedDirection(call) === "outbound").length,
        missedFailed: callRows.filter(call => ["missed", "failed", "no-answer", "no_answer"].includes(String(call.call_status).toLowerCase())).length,
        openEmergencies: callRows.filter(call => call.urgency === "Emergency" && !["Resolved", "Closed"].includes(call.status)).length,
        callFollowUps: callRows.filter(followUpOpen).length,
        emailsAwaitingReply: emailQueue.length,
        draftsAwaitingApproval: awaitingApproval.length,
        overdueFollowUps: callRows.filter(call => call.crm_tasks?.some(task => task.due_at && new Date(task.due_at) < now && !["completed", "closed"].includes(task.status))).length + emailRows.filter(row => row.follow_up_at && new Date(row.follow_up_at) < now && !["Replied", "Closed"].includes(row.status)).length,
        newLeasingLeads: leadRows.filter(lead => lead.status === "New").length,
        leasingCallbacksDue: leadRows.filter(lead => lead.next_follow_up_at && new Date(lead.next_follow_up_at) <= now).length,
      },
      callVolume: volume,
      urgencyDistribution: urgencyCounts,
      urgentCalls: callRows.filter(call => ["Emergency", "Urgent", "High"].includes(call.urgency)).slice(0, 6),
      inboundCalls: callRows.filter(call => normalizedDirection(call) === "inbound").slice(0, 5),
      outboundCalls: callRows.filter(call => normalizedDirection(call) === "outbound").slice(0, 5),
      emailQueue: emailQueue.slice(0, 6),
      leasingLeads: leadRows.slice(0, 6),
      operations: operations.data || [],
      integrations: connections.data || [],
      sync: { elevenlabs: eleven || null, lastCallSync: eleven?.last_success_at || null, lastEmailSync: emailCheckpoint },
      worker: {
        queued: jobRows.filter(row => ["queued", "retry"].includes(row.status)).length,
        running: jobRows.filter(row => row.status === "running").length,
        deadLetter: jobRows.filter(row => row.status === "dead_letter").length,
        lastActivity: jobRows[0]?.updated_at || null,
        nextScheduledAt: jobRows.filter(row => ["queued", "retry"].includes(row.status)).map(row => row.run_after).filter(Boolean).sort()[0] || null,
      },
    });
  } catch (error) { return apiError(error); }
}
