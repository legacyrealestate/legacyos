export const runtime = "nodejs";

import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { verifyResendWebhook } from "@/lib/security/resend-webhooks";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { fetchReceivedEmail, sendEmail } from "@/lib/communications/email";
import { generateEmailDraft } from "@/lib/ai/alma";
import { autonomyMode, emailAutoreplyMode } from "@/lib/config/env";
import { normalizeUrgency, requiresHumanReview } from "@/lib/workflows/classification";

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function string(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseMailbox(value: string) {
  const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return match
    ? { name: match[1].replace(/^"|"$/g, "").trim() || null, email: match[2].trim().toLowerCase() }
    : { name: null, email: value.trim().toLowerCase() };
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const eventId = req.headers.get("svix-id");
    const timestamp = req.headers.get("svix-timestamp");
    const signature = req.headers.get("svix-signature");
    const verified = verifyResendWebhook({
      rawBody,
      id: eventId,
      timestamp,
      signature,
      secret: process.env.RESEND_WEBHOOK_SECRET,
    });
    if (!verified) throw new ApiError("unauthorized", "Invalid email webhook signature.");

    let payload: Record<string, unknown>;
    try {
      payload = object(JSON.parse(rawBody));
    } catch {
      throw new ApiError("bad_request", "Malformed email webhook payload.");
    }

    const eventType = string(payload.type) || "unknown";
    if (!eventId) throw new ApiError("bad_request", "Missing provider event ID.");
    const supabase = createServiceSupabaseClient();
    const { data: existingEvent, error: eventLookupError } = await supabase
      .from("integration_events")
      .select("status")
      .eq("provider", "resend")
      .eq("provider_event_id", eventId)
      .maybeSingle();
    if (eventLookupError) throw new ApiError("server_error", eventLookupError.message);
    if (existingEvent?.status === "processed") {
      return apiJson({ success: true, duplicate: true });
    }

    const { error: eventError } = await supabase.from("integration_events").upsert(
      {
        provider: "resend",
        provider_event_id: eventId,
        event_type: eventType,
        status: "received",
        payload,
        error: null,
      },
      { onConflict: "provider,provider_event_id" }
    );
    if (eventError) throw new ApiError("server_error", eventError.message);

    if (eventType !== "email.received") {
      await supabase
        .from("integration_events")
        .update({ status: "processed", processed_at: new Date().toISOString() })
        .eq("provider", "resend")
        .eq("provider_event_id", eventId);
      return apiJson({ success: true, ignored: true });
    }

    const data = object(payload.data);
    const emailId = string(data.email_id) || string(data.id);
    if (!emailId) throw new ApiError("bad_request", "Missing received email ID.");
    const received = await fetchReceivedEmail(emailId);
    const fromValue = received.from || string(data.from);
    if (!fromValue) throw new ApiError("bad_request", "Inbound email has no sender.");
    const sender = parseMailbox(fromValue);
    const subject = received.subject || string(data.subject) || "No subject";
    const textBody = received.text || "";
    const combined = `${subject}\n${textBody}`;
    const urgency = normalizeUrgency(null, combined);
    const humanReview = requiresHumanReview({ urgency, text: combined });

    const { data: contact } = await supabase
      .from("crm_contacts")
      .select("id,full_name,property_label")
      .ilike("email", sender.email)
      .limit(1)
      .maybeSingle();

    const { data: thread, error: threadError } = await supabase
      .from("email_threads")
      .insert({
        provider: "resend",
        provider_thread_id: string(data.message_id) || emailId,
        subject,
        contact_id: contact?.id || null,
        contact_name: contact?.full_name || sender.name,
        contact_email: sender.email,
        status: humanReview ? "Needs Review" : "Open",
        urgency,
        last_message_at: received.created_at || new Date().toISOString(),
      })
      .select()
      .single();
    if (threadError) throw new ApiError("server_error", threadError.message);

    const { error: messageError } = await supabase.from("email_messages").insert({
      thread_id: thread.id,
      provider_message_id: emailId,
      direction: "inbound",
      from_email: sender.email,
      to_emails: received.to || [],
      subject,
      text_body: textBody,
      html_body: received.html || null,
      metadata: { cc: received.cc || [], eventId },
    });
    if (messageError) throw new ApiError("server_error", messageError.message);

    if (contact?.id) {
      await supabase
        .from("crm_contacts")
        .update({ last_contact_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", contact.id);
    }

    const replyMode = emailAutoreplyMode();
    let automationStatus = humanReview ? "needs_review" : "completed";
    let automationReason = humanReview ? "Urgent, emergency, legal, or human-requested message." : "Routine inbound email.";
    let draft: string | null = null;

    if (replyMode !== "off") {
      try {
        draft = await generateEmailDraft({
          subject,
          body: textBody,
          contactName: contact?.full_name || sender.name,
          property: contact?.property_label || null,
        });
        const canSend = replyMode === "send" && autonomyMode() === "autopilot" && !humanReview;
        let providerMessageId: string | null = null;
        if (canSend) {
          const sent = await sendEmail({
            to: sender.email,
            subject: /^re:/i.test(subject) ? subject : `Re: ${subject}`,
            text: draft,
          });
          providerMessageId = sent.id || null;
        }
        await supabase.from("email_messages").insert({
          thread_id: thread.id,
          provider_message_id: providerMessageId,
          direction: canSend ? "outbound" : "draft",
          from_email: process.env.EMAIL_FROM || "Legacy Nashville",
          to_emails: [sender.email],
          subject: /^re:/i.test(subject) ? subject : `Re: ${subject}`,
          text_body: draft,
          ai_generated: true,
          sent_at: canSend ? new Date().toISOString() : null,
        });
        await supabase
          .from("email_threads")
          .update({ status: canSend ? "Replied" : humanReview ? "Needs Review" : "Drafted", updated_at: new Date().toISOString() })
          .eq("id", thread.id);
        automationReason = canSend ? "Routine reply sent under autopilot policy." : "ALMA reply draft created for review.";
      } catch (error) {
        automationStatus = "failed";
        automationReason = error instanceof Error ? error.message : "Email drafting failed.";
      }
    }

    await Promise.all([
      supabase.from("automation_runs").insert({
        workflow: "email_intake_reply",
        entity_type: "email_thread",
        entity_id: thread.id,
        mode: replyMode === "send" ? "autopilot" : replyMode === "draft" ? "draft" : "assist",
        status: automationStatus,
        decision: draft ? "reply_prepared" : "inbox_only",
        reason: automationReason,
        input_snapshot: { subject, urgency, sender: sender.email },
        output_snapshot: { draftCreated: Boolean(draft) },
        completed_at: new Date().toISOString(),
      }),
      supabase.from("operations_feed").insert({
        type: "email_received",
        title: `${urgency} email received`,
        description: `${sender.email}: ${subject}`,
      }),
      supabase
        .from("integration_events")
        .update({ status: "processed", processed_at: new Date().toISOString() })
        .eq("provider", "resend")
        .eq("provider_event_id", eventId),
    ]);

    return apiJson({ success: true, threadId: thread.id, urgency, draftCreated: Boolean(draft) });
  } catch (error) {
    return apiError(error);
  }
}
