import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    const ticketId = body.ticketId;

    const { data: ticket } = await supabase
      .from("maintenance_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    const { data: vendors } = await supabase
      .from("vendors")
      .select("*");

    const aiPrompt = `
You are LegacyOS autonomous operations AI.

Analyze this maintenance ticket and determine:

1. Severity
2. Best vendor
3. Escalation level
4. Operational recommendations

Ticket:
${JSON.stringify(ticket)}

Vendors:
${JSON.stringify(vendors)}

Respond ONLY in JSON format:

{
  "severity": "",
  "recommendedVendor": "",
  "shouldEscalate": true,
  "summary": ""
}
`;

    const aiResponse =
      await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an autonomous property operations AI.",
          },
          {
            role: "user",
            content: aiPrompt,
          },
        ],
      });

    const raw =
      aiResponse.choices[0].message.content || "{}";

    const parsed = JSON.parse(raw);

    await supabase
      .from("maintenance_tickets")
      .update({
        assigned_vendor:
          parsed.recommendedVendor,
        status: parsed.shouldEscalate
          ? "Escalated"
          : "Vendor Assigned",
        ai_summary: parsed.summary,
      })
      .eq("id", ticketId);

    await supabase
      .from("operations_feed")
      .insert({
        type: "autonomous_action",
        title: "AI Autonomous Dispatch",
        description:
          parsed.summary,
      });

    await supabase
      .from("notifications")
      .insert({
        title: "AI Autonomous Action",
        description:
          parsed.summary,
      });

    return NextResponse.json({
      success: true,
      ai: parsed,
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        error:
          "Autonomous AI workflow failed",
      },
      {
        status: 500,
      }
    );

  }
}