import { apiError,apiJson } from "@/lib/security/api";import{requireCron}from"@/lib/security/cron";import{runAlma}from"@/lib/workflows/alma";
export async function GET(req:Request){try{requireCron(req);return apiJson({success:true,...await runAlma()});}catch(error){return apiError(error)}}
