import { apiError, apiJson, ApiError } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { syncEmail } from "@/lib/providers/email";

export async function GET(req: Request) {
  try {
    const auth = await requireUser();
    const db = createServiceSupabaseClient();
    const { data: connections, error: connectionError } = await db
      .from("provider_connections")
      .select("id,provider,account_email,status,last_error,last_sync_at,last_success_at,shared_with_staff")
      .or(`shared_with_staff.eq.true,user_id.eq.${auth.user.id}`);
    if (connectionError) throw new ApiError(connectionError.code === "42P01" ? "missing_migration" : "server_error", "Email platform is not available.");
    const ids = (connections || []).map((item) => item.id);
    if (!ids.length) return apiJson({ threads: [], connections: [], actions: [], staff: [] });
    const params = new URL(req.url).searchParams, search = params.get("q")?.slice(0, 120).toLowerCase();
    const threadQuery = db.from("email_threads")
      .select("*,email_messages(id,sender,recipients,cc,subject,body_text,body_html,attachment_metadata,provider_sent_at,status,is_read,internet_message_id,direction,created_at)")
      .in("connection_id", ids).order("last_message_at", { ascending: false }).limit(100);
    const [threads, actions, staff] = await Promise.all([
      threadQuery,
      db.from("email_outbound_actions").select("id,action,status,source_message_id,created_at,updated_at,last_error,request,provider_message_id,approved_at").in("connection_id", ids).order("created_at", { ascending: false }).limit(100),
      db.from("profiles").select("id,full_name").eq("active", true).order("full_name"),
    ]);
    if (threads.error || actions.error || staff.error) throw new ApiError("server_error", "Unable to load email operations.");
    const rawThreads=threads.data||[],threadIds=rawThreads.map(thread=>thread.id),contactIds=rawThreads.map(thread=>thread.contact_id).filter(Boolean),ticketIds=rawThreads.map(thread=>thread.ticket_id).filter(Boolean);
    const [audit,contacts,tickets,leads,jobs]=await Promise.all([threadIds.length?db.from("audit_logs").select("id,action,entity_id,detail,created_at,actor_id").eq("entity_type","email_thread").in("entity_id",threadIds).order("created_at",{ascending:false}).limit(300):Promise.resolve({data:[],error:null}),contactIds.length?db.from("crm_contacts").select("id,full_name,email,phone,contact_type,property_label,unit").in("id",contactIds):Promise.resolve({data:[],error:null}),ticketIds.length?db.from("maintenance_tickets").select("id,status,property,unit,issue,urgency").in("id",ticketIds):Promise.resolve({data:[],error:null}),threadIds.length?db.from("email_leads").select("*").in("thread_id",threadIds):Promise.resolve({data:[],error:null}),threadIds.length?db.from("email_intake_jobs").select("thread_id,status,attempts,last_error,updated_at").in("thread_id",threadIds):Promise.resolve({data:[],error:null})]);
    if(audit.error||contacts.error||tickets.error||leads.error||jobs.error)throw new ApiError("server_error","Unable to load email office relationships.");
    const rows=rawThreads.map(thread=>({...thread,contact:(contacts.data||[]).find(item=>item.id===thread.contact_id)||null,ticket:(tickets.data||[]).find(item=>item.id===thread.ticket_id)||null,lead:(leads.data||[]).find(item=>item.thread_id===thread.id)||null,intake_job:(jobs.data||[]).find(item=>item.thread_id===thread.id)||null})).filter(thread=>{const haystack=JSON.stringify(thread).toLowerCase();return(!search||haystack.includes(search))&&(!params.get("classification")||thread.primary_classification===params.get("classification"))&&(!params.get("urgency")||thread.urgency===params.get("urgency"))&&(!params.get("provider")||thread.provider===params.get("provider"))&&(!params.get("status")||thread.status===params.get("status"))&&(!params.get("automation")||(params.get("automation")==="disabled"?thread.automation_disabled:thread.automation_decision===params.get("automation")));});
    const backlog=(jobs.data||[]).filter(job=>["queued","retry","running"].includes(job.status)).length,failures=(jobs.data||[]).filter(job=>job.status==="dead_letter").length;
    return apiJson({ threads: rows, connections, actions: actions.data || [], staff: staff.data || [], audit: audit.data || [], processing:{backlog,failures,lastSuccess:rawThreads.map(item=>item.last_processing_success_at).filter(Boolean).sort().at(-1)||null,nextExpectedRun:"Daily at 06:15 UTC (import) and 06:30 UTC (ALMA repair)"} });
  } catch (error) { return apiError(error); }
}

export async function POST() {
  try {
    const auth = await requireUser();
    return apiJson({ success: true, ...await syncEmail(auth.user.id) });
  } catch (error) { return apiError(error); }
}
