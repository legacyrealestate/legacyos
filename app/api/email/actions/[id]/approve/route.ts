import{apiError,apiJson}from"@/lib/security/api";import{requireAdmin}from"@/lib/security/auth";import{approveEmailAction}from"@/lib/providers/email-compose";
export async function POST(_req:Request,context:{params:Promise<{id:string}>}){try{const auth=await requireAdmin(),{id}=await context.params;return apiJson(await approveEmailAction(id,auth.user.id))}catch(error){return apiError(error)}}
