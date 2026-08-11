import "server-only";
import crypto from "node:crypto";
import { ApiError } from "@/lib/security/api";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { emailProviderJson, refreshEmailToken, type Connection } from "@/lib/providers/email";

type Attachment = { filename: string; mimeType: string; contentBase64: string };
export type ComposeInput = { action: string; to?: string[]; cc?: string[]; subject?: string; body: string; attachments?: Attachment[]; idempotencyKey: string; providerDraftId?: string };
type Source = Record<string, unknown>;
const clean = (value: string) => value.replace(/[\r\n]+/g, " ").trim();
const addresses = (values?: string[]) => (values || []).map(clean).filter((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)).slice(0, 100);
const recipientObjects = (values: string[]) => addresses(values).map((address) => ({ emailAddress: { address } }));
const maxAttachmentBytes = () => Math.min(Number(process.env.EMAIL_ATTACHMENT_MAX_BYTES) || 10 * 1024 * 1024, 25 * 1024 * 1024);

export function buildMime(input: { to: string[]; cc?: string[]; subject: string; body: string; inReplyTo?: string | null; references?: string | null; attachments?: Attachment[] }) {
  const boundary = `legacyos_${crypto.randomBytes(12).toString("hex")}`;
  const lines = [`To: ${addresses(input.to).join(", ")}`];
  if (input.cc?.length) lines.push(`Cc: ${addresses(input.cc).join(", ")}`);
  lines.push(`Subject: ${clean(input.subject)}`, "MIME-Version: 1.0");
  if (input.inReplyTo) lines.push(`In-Reply-To: ${clean(input.inReplyTo)}`);
  if (input.references) lines.push(`References: ${clean(input.references)}`);
  const attachments = input.attachments || [];
  let total = 0;
  for (const item of attachments) {
    if(!/^[A-Za-z0-9+/]*={0,2}$/.test(item.contentBase64.replace(/\s/g,"")))throw new ApiError("bad_request","Attachment content must be valid base64.");
    const size = Buffer.from(item.contentBase64, "base64").length;
    total += size;
    if (size > maxAttachmentBytes() || total > maxAttachmentBytes()) throw new ApiError("bad_request", "Attachments exceed the configured size limit.");
  }
  if (!attachments.length) {
    lines.push("Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", Buffer.from(input.body).toString("base64"));
    return lines.join("\r\n");
  }
  lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`, "", `--${boundary}`, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", Buffer.from(input.body).toString("base64"));
  for (const item of attachments) lines.push(`--${boundary}`, `Content-Type: ${clean(item.mimeType || "application/octet-stream")}; name="${clean(item.filename)}"`, `Content-Disposition: attachment; filename="${clean(item.filename)}"`, "Content-Transfer-Encoding: base64", "", item.contentBase64.replace(/\s/g, ""));
  lines.push(`--${boundary}--`);
  return lines.join("\r\n");
}

async function sourceContext(userId: string, messageId: string) {
  const db = createServiceSupabaseClient();
  const { data, error } = await db.from("email_messages").select("id,provider_message_id,internet_message_id,references_header,sender,recipients,cc,subject,thread_id,connection_id,email_threads(provider_thread_id),provider_connections!inner(id,user_id,provider,encrypted_access_token,encrypted_refresh_token,access_token_expires_at,shared_with_staff)").eq("id", messageId).single();
  if (error || !data) throw new ApiError("not_found", "Source email was not found.");
  const connection = data.provider_connections as unknown as Connection;
  if (connection.user_id !== userId && !connection.shared_with_staff) throw new ApiError("forbidden", "Email access denied.");
  return { db, data: data as Source, connection, threadId: (data.email_threads as unknown as { provider_thread_id: string }).provider_thread_id };
}

function senderAddress(sender: unknown) {
  if (typeof sender === "string") return sender;
  const value = sender as Record<string, unknown> | null;
  return String(value?.value || (value?.emailAddress as Record<string, unknown> | undefined)?.address || "");
}

export async function requestEmailAction(userId: string, messageId: string, input: ComposeInput) {
  if (!/^[A-Za-z0-9:_-]{8,200}$/.test(input.idempotencyKey)) throw new ApiError("bad_request", "A valid idempotency key is required.");
  const ctx = await sourceContext(userId, messageId);
  const existing = await ctx.db.from("email_outbound_actions").select("id,status,provider_message_id").eq("idempotency_key", input.idempotencyKey).maybeSingle();
  if (existing.data) return { success: existing.data.status === "sent", idempotent: true, action: existing.data };
  // A provider draft is safe to create. Every action that can deliver external email
  // stays in an explicit waiting-for-approval state, regardless of ALMA mode.
  const needsApproval = !["draft", "draft_update"].includes(input.action);
  const recipients = input.to?.length ? input.to : input.action === "reply" ? [senderAddress(ctx.data.sender)] : input.action === "reply_all" ? [senderAddress(ctx.data.sender), ...((ctx.data.recipients as string[]) || [])] : [];
  const request = { ...input, to: addresses(recipients), attachments: input.attachments || [] };
  if (!request.to.length && input.action !== "draft") throw new ApiError("bad_request", "At least one valid recipient is required.");
  const { data: action, error } = await ctx.db.from("email_outbound_actions").insert({ connection_id: ctx.connection.id, source_message_id: messageId, action: input.action, idempotency_key: input.idempotencyKey, request, status: needsApproval ? "waiting_approval" : "draft", created_by: userId }).select("id,status").single();
  if (error) throw new ApiError("server_error", "Unable to create email action.");
  if (needsApproval) return { success: false, approvalRequired: true, actionId: action.id, status: action.status };
  return executeEmailAction(action.id, userId, false, ctx, request);
}

export async function approveEmailAction(actionId: string, adminId: string) {
  const db = createServiceSupabaseClient();
  const { data: action, error } = await db.from("email_outbound_actions").select("*,email_messages!inner(id,provider_message_id,internet_message_id,references_header,sender,recipients,cc,subject,thread_id,email_threads(provider_thread_id)),provider_connections!inner(id,user_id,provider,encrypted_access_token,encrypted_refresh_token,access_token_expires_at)").eq("id", actionId).single();
  if (error || !action) throw new ApiError("not_found", "Email action was not found.");
  if (action.status === "sent") return { success: true, idempotent: true, actionId };
  if (!["waiting_approval", "draft", "approved"].includes(action.status)) throw new ApiError("conflict", "Email action cannot be approved in its current state.");
  const claim=await db.from("email_outbound_actions").update({ status: "sending", approved_by: adminId, approved_at: new Date().toISOString(),updated_at:new Date().toISOString() }).eq("id", actionId).in("status",["waiting_approval","draft","approved"]).select("id").maybeSingle();
  if(!claim.data)throw new ApiError("conflict","Email action is already being processed.");
  const data = action.email_messages as unknown as Source;
  return executeEmailAction(actionId, adminId, true, { db, data, connection: action.provider_connections as unknown as Connection, threadId: (data.email_threads as { provider_thread_id: string }).provider_thread_id }, action.request as ComposeInput);
}

async function executeEmailAction(actionId: string, actorId: string, approved: boolean, ctx: Awaited<ReturnType<typeof sourceContext>>, input: ComposeInput) {
  const { db, data, connection, threadId } = ctx;
  await db.from("email_outbound_actions").update({ status: "sending", updated_at: new Date().toISOString() }).eq("id", actionId);
  try {
    const token = await refreshEmailToken(connection), to = addresses(input.to), cc = addresses(input.cc), subject = input.subject || String(data.subject || "");
    let result: Record<string, unknown> = {};
    if (connection.provider === "google") {
      const replying = input.action === "reply" || input.action === "reply_all" || input.action === "draft";
      const mime = buildMime({ to, cc, subject, body: input.body, inReplyTo: replying ? String(data.internet_message_id || "") : null, references: replying ? [String(data.references_header || ""), String(data.internet_message_id || "")].filter(Boolean).join(" ") : null, attachments: input.attachments });
      const message = { raw: Buffer.from(mime).toString("base64url"), threadId: replying ? threadId : undefined };
      if (input.action === "draft") result = await emailProviderJson("https://gmail.googleapis.com/gmail/v1/users/me/drafts", token, { method: "POST", body: JSON.stringify({ message }) });
      else if (input.action === "draft_update") { if (!input.providerDraftId) throw new ApiError("bad_request", "Provider draft ID is required."); result = await emailProviderJson(`https://gmail.googleapis.com/gmail/v1/users/me/drafts/${encodeURIComponent(input.providerDraftId)}`, token, { method: "PUT", body: JSON.stringify({ id: input.providerDraftId, message }) }); }
      else if (input.action === "draft_send") { if (!input.providerDraftId) throw new ApiError("bad_request", "Provider draft ID is required."); result = await emailProviderJson("https://gmail.googleapis.com/gmail/v1/users/me/drafts/send", token, { method: "POST", body: JSON.stringify({ id: input.providerDraftId }) }); }
      else result = await emailProviderJson("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", token, { method: "POST", body: JSON.stringify(message) });
    } else {
      const graphId = encodeURIComponent(String(data.provider_message_id));
      const content = { contentType: "Text", content: input.body };
      if (["draft_update", "draft_send"].includes(input.action)) {
        if (!input.providerDraftId) throw new ApiError("bad_request", "Provider draft ID is required.");
        const draftId = encodeURIComponent(input.providerDraftId);
        if (input.action === "draft_update") result = await emailProviderJson(`https://graph.microsoft.com/v1.0/me/messages/${draftId}`, token, { method: "PATCH", body: JSON.stringify({ subject, body: content, toRecipients: recipientObjects(to), ccRecipients: recipientObjects(cc) }) });
        else await emailProviderJson(`https://graph.microsoft.com/v1.0/me/messages/${draftId}/send`, token, { method: "POST" });
      } else if (["reply", "reply_all", "forward"].includes(input.action)) {
        const operation = input.action === "reply" ? "createReply" : input.action === "reply_all" ? "createReplyAll" : "createForward";
        const draft = await emailProviderJson(`https://graph.microsoft.com/v1.0/me/messages/${graphId}/${operation}`, token, { method: "POST", body: JSON.stringify(input.action === "forward" ? { toRecipients: recipientObjects(to), comment: "" } : {}) });
        const draftId = encodeURIComponent(String(draft.id));
        await emailProviderJson(`https://graph.microsoft.com/v1.0/me/messages/${draftId}`, token, { method: "PATCH", body: JSON.stringify({ subject, body: content, toRecipients: recipientObjects(to), ccRecipients: recipientObjects(cc) }) });
        for(const item of input.attachments||[]){if(Buffer.from(item.contentBase64,"base64").length>3*1024*1024)throw new ApiError("bad_request","Microsoft attachments must be 3 MiB or smaller.");await emailProviderJson(`https://graph.microsoft.com/v1.0/me/messages/${draftId}/attachments`,token,{method:"POST",body:JSON.stringify({"@odata.type":"#microsoft.graph.fileAttachment",name:clean(item.filename),contentType:clean(item.mimeType),contentBytes:item.contentBase64.replace(/\s/g,"")})});}
        await emailProviderJson(`https://graph.microsoft.com/v1.0/me/messages/${draftId}/send`, token, { method: "POST" });
        result = draft;
      } else if(input.action === "draft") {
        const draft=await emailProviderJson(`https://graph.microsoft.com/v1.0/me/messages/${graphId}/createReply`,token,{method:"POST",body:JSON.stringify({})});
        const draftId=encodeURIComponent(String(draft.id));
        result=await emailProviderJson(`https://graph.microsoft.com/v1.0/me/messages/${draftId}`,token,{method:"PATCH",body:JSON.stringify({subject,body:content,toRecipients:recipientObjects(to),ccRecipients:recipientObjects(cc)})});
        if(!result.id)result={...result,id:String(draft.id)};
      } else {
        const message = { subject, body: content, toRecipients: recipientObjects(to), ccRecipients: recipientObjects(cc), attachments: (input.attachments || []).map((item) => ({ "@odata.type": "#microsoft.graph.fileAttachment", name: clean(item.filename), contentType: clean(item.mimeType), contentBytes: item.contentBase64.replace(/\s/g, "") })) };
        if (input.action === "draft") result = await emailProviderJson("https://graph.microsoft.com/v1.0/me/messages", token, { method: "POST", body: JSON.stringify(message) });
        else await emailProviderJson("https://graph.microsoft.com/v1.0/me/sendMail", token, { method: "POST", body: JSON.stringify({ message, saveToSentItems: true }) });
      }
    }
    const finalStatus = ["draft", "draft_update"].includes(input.action) ? "draft" : "sent";
    await db.from("email_outbound_actions").update({ status: finalStatus, provider_message_id: String(result.id || result.messageId || "") || null, provider_result: { accepted: true, provider: connection.provider }, updated_at: new Date().toISOString() }).eq("id", actionId);
    await db.from("audit_logs").insert({ actor_id: actorId, action: `email_${input.action}_${finalStatus}`, entity_type: "email_message", entity_id: String(data.id), detail: { actionId, provider: connection.provider, recipientCount: to.length, approved, providerAccepted: true } });
    return { success: true, actionId, status: finalStatus, providerAccepted: true };
  } catch (error) {
    await db.from("email_outbound_actions").update({ status: "failed", last_error: error instanceof Error ? error.message : "Provider send failed", updated_at: new Date().toISOString() }).eq("id", actionId);
    throw error;
  }
}
