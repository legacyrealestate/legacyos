import { apiError, apiJson, ApiError } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    await requireUser();
    const db=createServiceSupabaseClient();
    const {data,error}=await db.from("email_leads").select("id,status,desired_property,unit_type,next_follow_up_at,assigned_to,created_at,updated_at,email_threads!inner(id,subject,last_message_at,primary_classification,contact_id,crm_contacts(full_name,email,phone))").order("created_at",{ascending:false}).limit(200);
    if(error)throw new ApiError(error.code==="42P01"?"missing_migration":"server_error","Leasing lead operations are not available.");
    const leads=(data||[]).filter((lead)=>{
      const thread=Array.isArray(lead.email_threads)?lead.email_threads[0]:lead.email_threads;
      return thread?.primary_classification==="Lead/leasing inquiry";
    }).map((lead)=>({
      ...lead,
      email_threads:Array.isArray(lead.email_threads)?lead.email_threads[0]:lead.email_threads,
    }));
    const now=Date.now();
    return apiJson({leads,counts:{new:leads.filter((lead)=>lead.status==="New").length,due:leads.filter((lead)=>lead.next_follow_up_at&&Date.parse(lead.next_follow_up_at)<=now).length,total:leads.length}});
  } catch (error) {
    return apiError(error);
  }
}
