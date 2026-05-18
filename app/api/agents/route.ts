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

  const body =
    await req.json();

  const prompt = `
You are LegacyOS multi-agent orchestration AI.

You control:
- Operations Agent
- Vendor Agent
- Emergency Agent
- Tenant Agent
- Risk Agent

Determine:
1. Which agents should activate
2. Operational recommendations
3. Priority level

Context:
${body.context}
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
              "You are a multi-agent orchestration AI.",
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
    response:
      response
        .choices[0]
        .message
        .content,
  });
}