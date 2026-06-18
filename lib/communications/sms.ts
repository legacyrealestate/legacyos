import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function sendSMS({
  to,
  body,
}: {
  to: string;
  body: string;
}) {
  if (!to || !to.startsWith("+")) {
    return { skipped: true, reason: "Invalid phone number" };
  }

  const message = await client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER!,
    to,
    body,
  });

  return {
    skipped: false,
    sid: message.sid,
    status: message.status,
  };
}
