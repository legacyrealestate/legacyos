import "server-only";
import { ApiError } from "@/lib/security/api";
import { generateEmailDraft } from "@/lib/ai/alma";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { requestEmailAction } from "@/lib/providers/email-compose";
import { classifyEmail,extractContact,parseMailbox,suppressionReason,textOnly,type SafeHeaders } from "@/lib/workflows/email-intake-policy";

const now=()=>new Date().toISOString();
export async function processEmailIntake(messageId:string){
  const db=createServiceSupabaseClient();
  const claim=await db.from("email_intake_jobs").update({status:"running",locked_at:now(),updated_at:now()}).eq("message_id",messageId).in("status",["queued","retry","running"]).select("id,attempts").maybeSingle();
  if(!claim.data)return{status:"duplicate"};
  const loaded=await db.from("email_messages").select("id,thread_id,sender,subject,body_text,body_html,headers_safe,attachment_metadata,provider_sent_at,email_threads!inner(id,connection_id,automation_disabled,property,status),provider_connections!inner(user_id,account_email)").eq("id",messageId).single();
  if(loaded.error||!loaded.data)throw new ApiError("not_found","Email intake message was not found.");
  const message=loaded.data,thread=message.email_threads as unknown as {id:string;connection_id:string;automation_disabled:boolean;property:string|null;status:string},connection=message.provider_connections as unknown as {user_id:string;account_email:string|null};
  const headers=(message.headers_safe||{})as SafeHeaders,sender=parseMailbox(message.sender),body=textOnly(String(message.body_text||message.body_html||"")),suppressed=suppressionReason({sender:message.sender,headers,ownAddresses:[connection.account_email||""]});
  const classification=classifyEmail({subject:message.subject,body,headers}),extracted=extractContact(body);
  if(suppressed||classification.primary==="Spam/automated"){
    await Promise.all([db.from("email_intake_jobs").update({status:"suppressed",decision:{reason:suppressed||"spam"},updated_at:now()}).eq("message_id",messageId),db.from("email_messages").update({intake_state:"suppressed",processed_at:now()}).eq("id",messageId),db.from("email_threads").update({primary_classification:"Spam/automated",classifications:["Spam/automated"],classification_confidence:1,classification_explanation:suppressed,automation_decision:"suppressed",automation_reason:suppressed,last_processing_success_at:now()}).eq("id",thread.id)]);
    await db.from("audit_logs").insert({action:"email_intake_suppressed",entity_type:"email_thread",entity_id:thread.id,detail:{reason:suppressed||"spam",messageId}});
    return{status:"suppressed"};
  }
  let contact=(await db.from("crm_contacts").select("*").eq("normalized_email",sender.email).maybeSingle()).data;
  if(!contact&&extracted.phone)contact=(await db.from("crm_contacts").select("*").eq("normalized_phone",extracted.phone).maybeSingle()).data;
  if(!contact){const created=await db.from("crm_contacts").insert({contact_type:classification.primary==="Lead/leasing inquiry"?"Lead":"Other",full_name:sender.name||sender.email.split("@")[0]||"Email contact",email:sender.email,normalized_email:sender.email,phone:extracted.phone,normalized_phone:extracted.phone,unit:extracted.unit,signature_text:extracted.signature,source:"email",source_email_message_id:messageId,first_contact_at:message.provider_sent_at||now(),last_contact_at:message.provider_sent_at||now(),status:classification.primary==="Lead/leasing inquiry"?"Lead":"Active"}).select("*").single();if(created.error){contact=(await db.from("crm_contacts").select("*").eq("normalized_email",sender.email).single()).data}else contact=created.data;}
  else {const managed=new Set<string>(contact.staff_managed_fields||[]),update:Record<string,unknown>={last_contact_at:message.provider_sent_at||now(),updated_at:now()};if(!contact.phone&&!managed.has("phone")&&extracted.phone)Object.assign(update,{phone:extracted.phone,normalized_phone:extracted.phone});if(!contact.unit&&!managed.has("unit")&&extracted.unit)update.unit=extracted.unit;await db.from("crm_contacts").update(update).eq("id",contact.id);}
  if(!contact)throw new ApiError("server_error","Unable to create or match the email contact.");
  await db.from("email_contact_provenance").upsert({contact_id:contact.id,message_id:messageId,extracted_fields:{phone:extracted.phone,unit:extracted.unit}},{onConflict:"contact_id,message_id",ignoreDuplicates:true});
  let ticketId:string|null=null;
  if(classification.classifications.some(x=>x==="Maintenance request"||x==="Emergency maintenance")){
    const issue=body.slice(0,4000),property=thread.property||"Unconfirmed — staff review";
    const ticket=await db.from("maintenance_tickets").upsert({source:"email",provider:"email",provider_conversation_id:`email:${messageId}`,tenant_name:contact.full_name,property,unit:extracted.unit,issue_category:classification.primary,issue,urgency:classification.urgency,status:classification.requiresHuman?"Needs Review":"New",source_email_message_id:messageId,email_thread_id:thread.id,crm_contact_id:contact.id,recording_available:false},{onConflict:"source_email_message_id"}).select("id").single();if(ticket.error)throw new ApiError("server_error","Unable to create the maintenance ticket.");ticketId=ticket.data.id;
    if(classification.requiresHuman)await Promise.all([db.from("notifications").insert({title:"Email maintenance review required",description:classification.explanation,type:classification.urgency==="Emergency"?"emergency":"warning",related_ticket_id:ticketId}),db.from("crm_tasks").upsert({title:"Review email maintenance request",description:classification.explanation,priority:classification.urgency==="Emergency"?"emergency":"urgent",ticket_id:ticketId,crm_contact_id:contact.id,idempotency_key:`email-maintenance-review:${messageId}`},{onConflict:"idempotency_key",ignoreDuplicates:true})]);
  }
  if(classification.primary==="Lead/leasing inquiry"){
    await db.from("email_leads").upsert({thread_id:thread.id,contact_id:contact.id,source_message_id:messageId,desired_property:thread.property,unit_type:extracted.unit,status:"New",next_follow_up_at:new Date(Date.now()+86400000).toISOString()},{onConflict:"thread_id"});
    await db.from("crm_tasks").upsert({title:"Follow up with email lead",description:"Verify availability, pricing, policies, and showing options before replying.",priority:"routine",crm_contact_id:contact.id,due_at:new Date(Date.now()+86400000).toISOString(),idempotency_key:`email-lead-followup:${thread.id}`},{onConflict:"idempotency_key",ignoreDuplicates:true});
  }
  const actionable=classification.primary!=="General";
  let outbound:Record<string,unknown>|null=null;
  if(actionable){
    const draft=await generateEmailDraft({subject:String(message.subject||""),body,contactName:contact.full_name,property:thread.property});
    outbound=await requestEmailAction(connection.user_id,messageId,{action:"draft",to:[sender.email],body:draft,idempotencyKey:`email-draft-${messageId}`});
  }
  const decision=classification.requiresHuman?"human_review_required":actionable?"draft_created":"no_reply_needed";
  await Promise.all([db.from("email_threads").update({contact_id:contact.id,ticket_id:ticketId||undefined,primary_classification:classification.primary,classifications:classification.classifications,classification_confidence:classification.confidence,classification_explanation:classification.explanation,extracted_fields:extracted,urgency:classification.urgency,automation_decision:decision,automation_reason:classification.requiresHuman?"deterministic safety policy":"routine intake policy",status:classification.requiresHuman?"Needs Review":actionable?"Drafted":"Open",last_processing_success_at:now()}).eq("id",thread.id),db.from("email_messages").update({intake_state:"completed",processed_at:now()}).eq("id",messageId),db.from("email_intake_jobs").update({status:classification.requiresHuman?"waiting_approval":"completed",decision:{classification:classification.primary,decision,contactId:contact.id,ticketId},last_error:null,updated_at:now()}).eq("message_id",messageId),db.from("audit_logs").insert({action:"email_intake_processed",entity_type:"email_thread",entity_id:thread.id,detail:{messageId,classification:classification.primary,confidence:classification.confidence,decision,contactId:contact.id,ticketId,outboundActionCreated:Boolean(outbound)}})]);
  return{status:classification.requiresHuman?"waiting_approval":"completed",decision};
}
