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
      .select("id,provider,account_email,status,last_error,shared_with_staff")
      .or(`shared_with_staff.eq.true,user_id.eq.${auth.user.id}`);
    if (connectionError) throw new ApiError(connectionError.code === "42P01" ? "missing_migration" : "server_error", "Email platform is not available.");
    const ids = (connections || []).map((item) => item.id);
    if (!ids.length) return apiJson({ threads: [], connections: [], actions: [], staff: [] });
    const search = new URL(req.url).searchParams.get("q")?.slice(0, 120);
    let threadQuery = db.from("email_threads")
      .select("*,email_messages(id,sender,recipients,subject,body_text,provider_sent_at,status,is_read)")
      .in("connection_id", ids).order("last_message_at", { ascending: false }).limit(100);
    if (search) threadQuery = threadQuery.ilike("subject", `%${search.replace(/[%_]/g, "\\$&")}%`);
    const [threads, actions, staff] = await Promise.all([
      threadQuery,
      db.from("email_outbound_actions").select("id,action,status,source_message_id,created_at,last_error").in("connection_id", ids).order("created_at", { ascending: false }).limit(50),
      db.from("profiles").select("id,full_name").eq("active", true).order("full_name"),
    ]);
    if (threads.error || actions.error || staff.error) throw new ApiError("server_error", "Unable to load email operations.");
    return apiJson({ threads: threads.data || [], connections, actions: actions.data || [], staff: staff.data || [] });
  } catch (error) { return apiError(error); }
}

export async function POST() {
  try {
    const auth = await requireUser();
    return apiJson({ success: true, ...await syncEmail(auth.user.id) });
  } catch (error) { return apiError(error); }
}
