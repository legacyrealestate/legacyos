import "server-only";
import { apiError,apiJson } from "@/lib/security/api";
import { ingestTwilioVoice,verifyTwilioVoiceRequest } from "@/lib/providers/twilio-voice";
export async function handleTwilioVoiceWebhook(req:Request,path:string,eventType:string,twiml=false){try{const raw=await req.text(),params=Object.fromEntries(new URLSearchParams(raw));verifyTwilioVoiceRequest(req,params,path);const result=await ingestTwilioVoice(params,eventType);if(twiml)return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>",{headers:{"Content-Type":"text/xml","Cache-Control":"no-store","X-LegacyOS-Call":result.callSid}});return apiJson({success:true,...result})}catch(error){return apiError(error)}}
