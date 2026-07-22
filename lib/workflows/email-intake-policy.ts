import { classifySafety, requiresHumanReview } from "./classification.ts";

export const EMAIL_CLASSIFICATIONS = ["Lead/leasing inquiry","Resident request","Maintenance request","Emergency maintenance","Owner communication","Vendor communication","Applicant communication","Accounting/payment","General","Spam/automated"] as const;
export type EmailClassification = typeof EMAIL_CLASSIFICATIONS[number];
export type SafeHeaders = Record<string,string>;

export function normalizeEmail(value:string){return value.trim().toLowerCase()}
export function normalizePhone(value:string){const digits=value.replace(/\D/g,"");return digits.length===10?`+1${digits}`:digits.length>=11?`+${digits}`:null}
export function parseMailbox(value:unknown){
  const raw=typeof value==="string"?value:String((value as Record<string,unknown>|null)?.value||(value as Record<string,unknown>|null)?.emailAddress&&((value as Record<string,unknown>).emailAddress as Record<string,unknown>).address||"");
  const match=raw.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>/) ;
  return {name:(match?.[1]||"").trim()||null,email:normalizeEmail(match?.[2]||raw)};
}
export function textOnly(value:string|null|undefined){return (value||"").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim().slice(0,100_000)}
export function extractContact(text:string){const phone=text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/)?.[0];const unit=text.match(/\b(?:unit|apt|apartment|suite)\s*#?([\w-]+)/i)?.[1];return{phone:phone?normalizePhone(phone):null,unit:unit||null,signature:text.split(/\n--\s*\n|\n_{3,}\n/).at(-1)?.slice(0,1000)||null}}
export function suppressionReason(input:{sender:unknown;headers?:SafeHeaders;ownAddresses?:string[]}){
  const email=parseMailbox(input.sender).email,headers=Object.fromEntries(Object.entries(input.headers||{}).map(([k,v])=>[k.toLowerCase(),String(v).toLowerCase()]));
  if((input.ownAddresses||[]).map(normalizeEmail).includes(email))return"company_address";
  if(/(?:^|[._-])(?:no-?reply|do-?not-?reply|mailer-daemon)(?:[+@._-]|$)/i.test(email))return"automated_sender";
  if(headers["auto-submitted"]&&headers["auto-submitted"]!=="no")return"auto_submitted";
  if(/bulk|list|junk/.test(headers.precedence||"")||headers["list-id"])return"mailing_list";
  return null;
}
export function classifyEmail(input:{subject?:string|null;body?:string|null;headers?:SafeHeaders}){
  const text=textOnly(`${input.subject||""}\n${input.body||""}`),safety=classifySafety(text),labels:EmailClassification[]=[];
  if(suppressionReason({sender:"",headers:input.headers}))labels.push("Spam/automated");
  if(safety.classification==="emergency")labels.push("Emergency maintenance");
  if(/\b(?:lease|leasing|rent|rental|availability|tour|showing|move[- ]?in|bedroom)\b/i.test(text))labels.push("Lead/leasing inquiry");
  if(/\b(?:repair|broken|leak|toilet|sink|hvac|air condition|heat|maintenance|mold|pest|lockout)\b/i.test(text))labels.push(safety.classification==="emergency"?"Emergency maintenance":"Maintenance request");
  if(/\b(?:resident|tenant|my unit|my apartment)\b/i.test(text))labels.push("Resident request");
  if(/\b(?:owner|statement|distribution)\b/i.test(text))labels.push("Owner communication");
  if(/\b(?:vendor|invoice|estimate|contractor)\b/i.test(text))labels.push("Vendor communication");
  if(/\b(?:application|applicant|screening|background check)\b/i.test(text))labels.push("Applicant communication");
  if(/\b(?:payment|rent due|balance|charge|refund|deposit|invoice)\b/i.test(text))labels.push("Accounting/payment");
  if(!labels.length)labels.push("General");
  const legal=/\b(?:lawyer|attorney|lawsuit|legal action|fair housing|evict|discrimination)\b/i.test(text),angry=/\b(?:furious|unacceptable|report you|threat)\b/i.test(text),paymentDispute=/\b(?:dispute|chargeback|wrongful charge)\b/i.test(text),human=/\b(?:human|manager|supervisor|speak to (?:a )?person|call me)\b/i.test(text);
  const needsHuman=requiresHumanReview({urgency:safety.classification==="emergency"?"Emergency":safety.classification==="urgent"?"Urgent":"Medium",text})||legal||angry||paymentDispute||human;
  return{classifications:[...new Set(labels)],primary:labels[0],confidence:labels[0]==="General"?.65:.92,explanation:safety.reason,urgency:safety.classification==="emergency"?"Emergency":safety.classification==="urgent"?"Urgent":"Normal",requiresHuman:needsHuman};
}
export function canAutoSend(input:{confidence:number;requiresHuman:boolean;automationDisabled?:boolean;classification:EmailClassification;headers?:SafeHeaders;sender?:unknown;ownAddresses?:string[];threadOutboundLastHour?:number}){
  const threshold=Math.max(.5,Math.min(1,Number(process.env.EMAIL_AUTOREPLY_MIN_CONFIDENCE)||.9));
  const unsafe=["Emergency maintenance","Accounting/payment","Spam/automated"].includes(input.classification);
  return process.env.EMAIL_AUTOREPLY_MODE==="send"&&process.env.AUTONOMY_MODE==="autopilot"&&process.env.ENABLE_OUTBOUND_COMMUNICATIONS==="true"&&!input.automationDisabled&&!input.requiresHuman&&!unsafe&&input.confidence>=threshold&&!suppressionReason({sender:input.sender,headers:input.headers,ownAddresses:input.ownAddresses})&&(input.threadOutboundLastHour||0)<Number(process.env.EMAIL_THREAD_REPLY_RATE_LIMIT||1);
}
