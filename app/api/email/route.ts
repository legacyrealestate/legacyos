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
    const search = new URL(req.url).searchParams.get("q")?.slice(0, 120);
    let threadQuery = db.from("email_threads")
      .select("*,email_messages(id,sender,recipients,cc,subject,body_text,body_html,attachment_metadata,provider_sent_at,status,is_read,internet_message_id,direction,created_at)")
      .in("connection_id", ids).order("last_message_at", { ascending: false }).limit(100);
    if (search) threadQuery = threadQuery.ilike("subject", `%${search.replace(/[%_]/g, "\\$&")}%`);
    const [threads, actions, staff] = await Promise.all([
      threadQuery,
      db.from("email_outbound_actions").select("id,action,status,source_message_id,created_at,updated_at,last_error,request,provider_message_id,approved_at").in("connection_id", ids).order("created_at", { ascending: false }).limit(100),
      db.from("profiles").select("id,full_name").eq("active", true).order("full_name"),
    ]);
    if (threads.error || actions.error || staff.error) throw new ApiError("server_error", "Unable to load email operations.");
    const threadIds = (threads.data || []).map(thread => thread.id);
    const audit = threadIds.length ? await db.from("audit_logs").select("id,action,entity_id,detail,created_at,actor_id").eq("entity_type", "email_thread").in("entity_id", threadIds).order("created_at", { ascending: false }).limit(200) : { data: [], error: null };
    if (audit.error) throw new ApiError("server_error", "Unable to load email audit history.");
    return apiJson({ threads: threads.data || [], connections, actions: actions.data || [], staff: staff.data || [], audit: audit.data || [] });
  } catch (error) { return apiError(error); }
}

export async function POST() {
  try {
    const auth = await requireUser();
    return apiJson({ success: true, ...await syncEmail(auth.user.id) });
  } catch (error) { return apiError(error); }
}
