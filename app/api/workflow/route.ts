import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const openai =
  new OpenAI({
    apiKey:
      process.env
        .OPENAI_API_KEY!,
  });

const supabase =
  createClient(
    process.env
      .NEXT_PUBLIC_SUPABASE_URL!,
    process.env
      .SUPABASE_SERVICE_ROLE_KEY!
  );

export async function POST(
  req: Request
) {

  const body =
    await req.json();

  const userCommand =
    body.command;

  const prompt = `
You are LegacyOS autonomous workflow AI.

Interpret this command and determine the operational action.

Command:
${userCommand}

Return JSON ONLY:

{
  "action": "",
  "target": "",
  "status": ""
}
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
              "You are an autonomous operations AI.",
          },
          {
            role:
              "user",
            content:
              prompt,
          },
        ],
      });

  const raw =
    response
      .choices[0]
      .message
      .content || "{}";

  const parsed =
    JSON.parse(raw);

  await supabase
    .from(
      "operations_feed"
    )
    .insert({
      type:
        "workflow",
      title:
        parsed.action,
      description:
        userCommand,
    });

  return NextResponse.json({
    success: true,
    parsed,
  });
}