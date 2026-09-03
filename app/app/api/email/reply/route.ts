import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { assertString, assertUuid, safeJsonObject } from "@/lib/security/validation";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { generateEmailDraft } from "@/lib/ai/alma";
import { sendEmail } from "@/lib/communications/email";

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    const body = safeJsonObject(await req.json());
    const threadId = assertUuid(body.threadId, "thread ID");
    const action = body.action === "send" ? "send" : "generate";
    const supabase = createServiceSupabaseClient();
    const [threadResult, messagesResult] = await Promise.all([
      supabase.from("email_threads").select("*").eq("id", threadId).single(),
      supabase.from("email_messages").select("*").eq("thread_id", threadId).order("created_at"),
    ]);
    if (threadResult.error) throw new ApiError("not_found", "Email thread not found.");
    if (messagesResult.error) throw new ApiError("server_error", messagesResult.error.message);
    const thread = threadResult.data;
    const messages = messagesResult.data || [];

    if (action === "generate") {
      const latestInbound = [...messages].reverse().find((message) => message.direction === "inbound");
      if (!latestInbound) throw new ApiError("bad_request", "This thread has no inbound message.");
      const draft = await generateEmailDraft({
        subject: thread.subject,
        body: latestInbound.text_body || "",
        contactName: thread.contact_name,
      });
      const { data, error } = await supabase
        .from("email_messages")
        .insert({
          thread_id: threadId,
          direction: "draft",
          from_email: process.env.EMAIL_FROM || "Legacy Nashville",
          to_emails: [thread.contact_email],
          subject: /^re:/i.test(thread.subject) ? thread.subject : `Re: ${thread.subject}`,
          text_body: draft,
          ai_generated: true,
        })
        .select()
        .single();
      if (error) throw new ApiError("server_error", error.message);
      await supabase.from("email_threads").update({ status: "Drafted", updated_at: new Date().toISOString() }).eq("id", threadId);
      return apiJson({ success: true, message: data });
    }

    const messageId = assertUuid(body.messageId, "message ID");
    const draft = messages.find((message) => message.id === messageId && message.direction === "draft");
    if (!draft) throw new ApiError("not_found", "Draft message not found.");
    const text = assertString(body.text || draft.text_body, "reply", 10000);
    const sent = await sendEmail({ to: thread.contact_email, subject: draft.subject, text });
    const now = new Date().toISOString();
    const [messageUpdate, threadUpdate] = await Promise.all([
      supabase
        .from("email_messages")
        .update({
          direction: "outbound",
          provider_message_id: sent.id,
          text_body: text,
          approved_by: auth.user.id,
          sent_at: now,
        })
        .eq("id", messageId),
      supabase.from("email_threads").update({ status: "Replied", last_message_at: now, updated_at: now }).eq("id", threadId),
    ]);
    if (messageUpdate.error) throw new ApiError("server_error", messageUpdate.error.message);
    if (threadUpdate.error) throw new ApiError("server_error", threadUpdate.error.message);
    return apiJson({ success: true, providerMessageId: sent.id });
  } catch (error) {
    return apiError(error);
  }
}
