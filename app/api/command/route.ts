export const runtime = "nodejs";

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
    const question = body.question || "";

    const { data: tickets } = await supabase
      .from("maintenance_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: vendors } = await supabase
      .from("vendors")
      .select("*")
      .limit(80);

    const { data: updates } = await supabase
      .from("ticket_updates")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    const { data: memory } = await supabase
      .from("command_memory")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are LegacyOS Command Center AI. Answer operational questions using the provided tickets, vendors, updates, and memory. Be concise, direct, and operational. If a vendor was dispatched, say who was dispatched and for what issue. Never make up data.",
        },
        {
          role: "user",
          content: `
Question:
${question}

Recent Maintenance Tickets:
${JSON.stringify(tickets, null, 2)}

Vendors:
${JSON.stringify(vendors, null, 2)}

Recent Ticket Updates:
${JSON.stringify(updates, null, 2)}

Memory:
${JSON.stringify(memory, null, 2)}
          `,
        },
      ],
    });

    const answer =
      completion.choices[0].message.content || "No answer generated.";

    await supabase.from("command_memory").insert({
      question,
      answer,
      context: {
        tickets_count: tickets?.length || 0,
        vendors_count: vendors?.length || 0,
      },
    });

    return NextResponse.json({
      success: true,
      answer,
    });

  } catch (error) {
    console.error("COMMAND CENTER ERROR:", error);

    return NextResponse.json(
      { error: "Command Center failed" },
      { status: 500 }
    );
  }
}
