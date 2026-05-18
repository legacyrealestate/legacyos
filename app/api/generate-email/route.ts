import OpenAI from "openai";

import { NextResponse } from "next/server";

const openai =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY!,
  });

export async function POST(
  req: Request
) {

  try {

    const body =
      await req.json();

    const category =
      body.category;

    const subject =
      body.subject;

    const summary =
      body.summary;

    const completion =
      await openai.chat.completions.create({
        model:
          "gpt-4.1-mini",

        messages: [
          {
            role:
              "system",

            content:
              `
You are LegacyOS.

Generate professional operational follow-up emails.

Tone:
- premium
- calm
- concise
- operational
- human
- high-end property management

Do not sound robotic.
`,
          },

          {
            role:
              "user",

            content:
              `
Category:
${category}

Subject:
${subject}

Summary:
${summary}
`,
          },
        ],
      });

    return NextResponse.json({
      email:
        completion.choices[0]
          .message.content,
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );

  }

}