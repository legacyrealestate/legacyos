import { NextResponse } from "next/server";

export async function POST() {
  const twiml = `
    <?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="alice">
        Hello. You have reached Legacy Property Group.
        Our AI operations assistant is currently active.
        Please briefly describe your maintenance issue after the tone.
      </Say>

      <Record
        maxLength="120"
        transcribe="true"
        playBeep="true"
      />

      <Say voice="alice">
        Thank you. Your request has been recorded and will be reviewed shortly.
      </Say>
    </Response>
  `;

  return new NextResponse(twiml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml",
    },
  });
}