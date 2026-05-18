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
You are LegacyOS.

LegacyOS is an elite operational intelligence system for property infrastructure management.

You monitor:
- maintenance operations
- emergency escalations
- vendors
- properties
- infrastructure risk
- operational efficiency
- tenant issues

Your tone:
- concise
- executive
- intelligent
- operational
- calm
- modern
- human

DO NOT:
- sound robotic
- sound like customer support
- say "Would you like me to..."
- overexplain
- use bullet lists unless needed
- sound like ChatGPT
- dump raw JSON

Respond naturally like a real operational AI platform.

User request:
${body.prompt}
`;

    const response =
      await openai
        .chat
        .completions
        .create({
          model:
            "gpt-4.1-mini",

          temperature: 0.7,

          messages: [
            {
              role:
                "system",

              content:
                prompt,
            },
          ],
        });

    return NextResponse.json({
      reply:
        response
          .choices[0]
          .message
          .content,
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        reply:
          "LegacyOS operational intelligence is temporarily unavailable.",
      },
      {
        status: 500,
      }
    );

  }
}