import { apiError, apiJson, ApiError } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { generateEmailDraft } from "@/lib/ai/alma";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireUser();
    const { id } = await context.params;
    const db = createServiceSupabaseClient();
    const { data } = await db
      .from("email_threads")
      .select("*,provider_connections!inner(user_id,shared_with_staff)")
      .eq("id", id)
      .maybeSingle();
    if (!data) throw new ApiError("not_found", "Email thread was not found.");
    const connection = data.provider_connections as unknown as {
      user_id: string;
      shared_with_staff: boolean;
    };
    if (connection.user_id !== auth.user.id && !connection.shared_with_staff)
      throw new ApiError("forbidden", "Email access denied.");
    const [messages, lead, contact] = await Promise.all([
      db
        .from("email_messages")
        .select(
          "sender,subject,body_text,direction,provider_sent_at,created_at",
        )
        .eq("thread_id", id)
        .order("provider_sent_at", { ascending: false })
        .limit(20),
      db
        .from("email_leads")
        .select(
          "status,lead_temperature,lead_score,lead_score_reasons,desired_property",
        )
        .eq("thread_id", id)
        .maybeSingle(),
      data.contact_id
        ? db
            .from("crm_contacts")
            .select("full_name")
            .eq("id", data.contact_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (messages.error || lead.error || contact.error)
      throw new ApiError("server_error", "Unable to prepare this email reply.");
    const inbound = (messages.data || []).find(
      (message) => message.direction === "inbound",
    );
    if (!inbound)
      throw new ApiError(
        "bad_request",
        "This thread has no inbound email to reply to.",
      );
    const leadContext = lead.data
      ? `Lead status: ${lead.data.status || "New"}; temperature: ${lead.data.lead_temperature || "Unknown"}; score: ${lead.data.lead_score || 0}; desired property: ${lead.data.desired_property || "Not provided"}; signals: ${(lead.data.lead_score_reasons || []).join(", ") || "None"}.`
      : null;
    const draft = await generateEmailDraft({
      subject: String(inbound.subject || data.subject || ""),
      body: String(inbound.body_text || ""),
      contactName: contact.data?.full_name || null,
      property: lead.data?.desired_property || data.property || null,
      leadContext,
    });
    const updatedAt = new Date().toISOString();
    const update = await db
      .from("email_threads")
      .update({
        alma_draft_text: draft,
        automation_decision: "staff_review_required",
        updated_at: updatedAt,
      })
      .eq("id", id);
    if (update.error)
      throw new ApiError("server_error", "Unable to save the generated reply.");
    await db
      .from("audit_logs")
      .insert({
        actor_id: auth.user.id,
        action: "email.draft_generated",
        entity_type: "email_thread",
        entity_id: id,
        detail: {
          source: "manual_staff_request",
          hasLeadContext: Boolean(lead.data),
        },
      });
    return apiJson({ success: true, draft });
  } catch (error) {
    return apiError(error);
  }
}
