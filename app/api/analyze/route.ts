import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai =
  new OpenAI({
    apiKey:
      process.env
        .OPENAI_API_KEY!,
  });

export async function POST(
  req: Request
) {

  try {

    const body =
      await req.json();

    const prompt = `
Analyze this maintenance transcript.

Determine:
- urgency
- tenant sentiment
- legal risk
- operational recommendations

Transcript:
${body.transcript}
`;

    const response =
      await openai
        .chat
        .completions
        .create({
          model:
            "gpt-4.1-mini",
          messages: [
            {
              role:
                "system",
              content:
                "You are an operational risk AI.",
            },
            {
              role:
                "user",
              content:
                prompt,
            },
          ],
        });

    return NextResponse.json({
      analysis:
        response
          .choices[0]
          .message
          .content,
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        error:
          "AI analysis failed",
      },
      {
        status: 500,
      }
    );

  }
}