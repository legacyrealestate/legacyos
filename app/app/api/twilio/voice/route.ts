import { NextResponse } from "next/server";
import { apiError } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";

export async function POST() {
  try {
    await requireUser();
    return NextResponse.json(
      {
        success: false,
        obsolete: true,
        message:
          "Inbound voice is handled by ElevenLabs. Do not configure Twilio voice webhooks to this route.",
      },
      { status: 410 }
    );
  } catch (error) {
    return apiError(error);
  }
}
