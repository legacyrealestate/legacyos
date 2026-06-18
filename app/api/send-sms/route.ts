import { NextResponse } from "next/server";
import { sendSMS } from "@/lib/communications/sms";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const result = await sendSMS({
      to: body.to,
      body: body.message,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("SMS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}
