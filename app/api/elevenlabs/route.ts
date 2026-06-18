import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { detectIntent } from "@/app/lib/agentRouter";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const transcript =
      body.transcript ||
      body.text ||
      body.message ||
      "No transcript provided.";

    const caller =
      body.caller_number ||
      body.phone ||
      body.from ||
      "Unknown";

    const intent = detectIntent(transcript);

    const analysis = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
Analyze this Legacy Real Estate call.

Return JSON only:
{
  "summary": "",
  "urgency": "Low | Medium | High | Emergency",
  "nextAction": "",
  "property": "",
  "tenantName": ""
}
`,
        },
        { role: "user", content: transcript },
      ],
    });

    const parsed = JSON.parse(analysis.choices[0].message.content || "{}");

    let ticket = null;
    let ticketError = null;

    if (intent === "maintenance") {
      const result = await supabase
        .from("maintenance_tickets")
        .insert({
          tenant_name: parsed.tenantName || "Caller",
          phone: caller,
          issue: parsed.nextAction || transcript.slice(0, 120),
          transcript,
          urgency: parsed.urgency || "Medium",
          ai_summary: parsed.summary || transcript,
          status: parsed.urgency === "Emergency" ? "Emergency Escalated" : "Open",
          property: parsed.property || "Unassigned",
        })
        .select()
        .single();

      ticket = result.data;
      ticketError = result.error;

      if (ticketError) {
        console.error("TICKET INSERT ERROR:", ticketError);
      }
    }

    const feedResult = await supabase
      .from("operations_feed")
      .insert({
        type: intent,
        title: `New ${intent} workflow`,
        description: parsed.summary || transcript,
      })
      .select()
      .single();

    if (feedResult.error) {
      console.error("FEED INSERT ERROR:", feedResult.error);
    }

    if (ticketError || feedResult.error) {
      return NextResponse.json(
        {
          success: false,
          intent,
          ticketError,
          feedError: feedResult.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      intent,
      ticket,
      feed: feedResult.data,
    });
  } catch (error) {
    console.error("ELEVENLABS WEBHOOK ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}
