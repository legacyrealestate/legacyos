import { apiError,apiJson,ApiError } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { emailAction } from "@/lib/providers/email";
import { requestEmailAction,type ComposeInput } from "@/lib/providers/email-compose";
export async function POST(req:Request,context:{params:Promise<{id:string}>}){try{const auth=await requireUser();const{id}=await context.params;const body=await req.json()as ComposeInput|{action?:"read"|"unread"|"archive"};if(!body.action)throw new ApiError("bad_request","Email action is required.");if(["read","unread","archive"].includes(body.action))return apiJson(await emailAction(auth.user.id,id,body.action as"read"|"unread"|"archive"));if(!["draft","draft_update","draft_send","send","reply","reply_all","forward"].includes(body.action))throw new ApiError("bad_request","Unsupported email action.");return apiJson(await requestEmailAction(auth.user.id,id,body as ComposeInput),{status:202});}catch(error){return apiError(error)}}
