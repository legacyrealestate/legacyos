export const runtime = "nodejs";

import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey:
    process.env.OPENAI_API_KEY,
});

export async function POST(
  req: Request
) {

  try {

    const body =
      await req.json();

    const completion =
      await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a professional property management AI assistant.",
          },
          {
            role: "user",
            content:
              `
Tenant: ${body.tenant_name}

Issue:
${body.issue}

Urgency:
${body.urgency}

Generate a professional response.
              `,
          },
        ],
      });

    const reply =
      completion.choices[0]
        .message.content;

    return NextResponse.json({
      success: true,
      reply,
    });

  } catch (e) {

    console.error(e);

    return NextResponse.json(
      {
        error:
          "Failed to generate reply",
      },
      {
        status: 500,
      }
    );

  }

}
