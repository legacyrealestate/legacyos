import{handleTwilioVoiceWebhook}from"@/lib/providers/twilio-webhook";
export async function POST(req:Request){return handleTwilioVoiceWebhook(req,"/api/twilio/voice/outbound","outbound",true)}
