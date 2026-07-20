import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { assertOptionalString, assertUuid, safeJsonObject } from "@/lib/security/validation";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    await requireUser();
    const threadId = new URL(req.url).searchParams.get("threadId");
    const supabase = createServiceSupabaseClient();
    if (threadId) {
      const id = assertUuid(threadId, "thread ID");
      const [thread, messages] = await Promise.all([
        supabase.from("email_threads").select("*").eq("id", id).single(),
        supabase.from("email_messages").select("*").eq("thread_id", id).order("created_at"),
      ]);
      if (thread.error) throw new ApiError("not_found", "Email thread not found.");
      if (messages.error) throw new ApiError("server_error", messages.error.message);
      return apiJson({ thread: thread.data, messages: messages.data || [] });
    }

    const { data, error } = await supabase
      .from("email_threads")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(100);
    if (error) throw new ApiError("server_error", error.message);
    return apiJson(data || []);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireUser();
    const body = safeJsonObject(await req.json());
    const id = assertUuid(body.id, "thread ID");
    const status = assertOptionalString(body.status, "status", 40);
    if (!status || !["Open", "Closed", "Needs Review"].includes(status)) {
      throw new ApiError("bad_request", "Invalid email thread status.");
    }
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("email_threads")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new ApiError("server_error", error.message);
    return apiJson({ success: true, thread: data });
  } catch (error) {
    return apiError(error);
  }
}
