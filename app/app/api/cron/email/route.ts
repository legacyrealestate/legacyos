import { apiError,apiJson } from "@/lib/security/api";
import { requireCron } from "@/lib/security/cron";
import { syncEmail } from "@/lib/providers/email";
import { runAlma } from "@/lib/workflows/alma";
export async function GET(req:Request){try{requireCron(req);const sync=await syncEmail(),processing=await runAlma(50);return apiJson({success:true,...sync,processing});}catch(error){return apiError(error)}}
