import { apiError,apiJson } from "@/lib/security/api";
import { requireCron } from "@/lib/security/cron";
import { syncEmail } from "@/lib/providers/email";
export async function GET(req:Request){try{requireCron(req);return apiJson({success:true,...await syncEmail()});}catch(error){return apiError(error)}}
