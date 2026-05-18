import OpenAI from "openai";

import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { detectIntent } from "@/app/lib/agentRouter";

const openai =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY!,
  });

const supabase =
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function POST(
  req: Request
) {

  try {

    const body =
      await req.json();

    const transcript =
      body.transcript ||
      "No transcript provided.";

    const caller =
      body.caller_number ||
      "Unknown";

    /*
      DETECT INTENT
    */

    const intent =
      detectIntent(
        transcript
      );

    /*
      AI ANALYSIS
    */

    const analysis =
      await openai.chat.completions.create({
        model:
          "gpt-4.1-mini",

        response_format: {
          type:
            "json_object",
        },

        messages: [
          {
            role:
              "system",

            content:
              `
Analyze this operational conversation.

Return valid JSON:

{
  "summary": "",
  "urgency": "",
  "followUp": "",
  "nextAction": ""
}
`,
          },

          {
            role:
              "user",

            content:
              transcript,
          },
        ],
      });

    const parsed =
      JSON.parse(
        analysis.choices[0]
          .message.content || "{}"
      );

    /*
      ROUTING
    */

    if (
      intent ===
      "maintenance"
    ) {

      await supabase
        .from(
          "maintenance_tickets"
        )
        .insert({
          tenant_name:
            "Caller",

          phone:
            caller,

          issue:
            transcript.slice(
              0,
              120
            ),

          transcript,

          urgency:
            parsed.urgency ||
            "Medium",

          ai_summary:
            parsed.summary,

          status:
            "Open",

          property:
            "Unassigned",

          analysis:
            parsed,
        });

    }

    if (
      intent ===
      "leasing"
    ) {

      await supabase
        .from(
          "leasing_leads"
        )
        .insert({
          caller,
          transcript,
          ai_summary:
            parsed.summary,
          intent,
        });

    }

    if (
      intent ===
      "investor"
    ) {

      await supabase
        .from(
          "investor_leads"
        )
        .insert({
          caller,
          transcript,
          ai_summary:
            parsed.summary,
          intent,
        });

    }

    /*
      OPERATIONS FEED
    */

    await supabase
      .from(
        "operations_feed"
      )
      .insert({
        type:
          intent,

        title:
          `New ${intent} workflow`,

        description:
          parsed.summary,
      });

    return NextResponse.json({
      success: true,
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