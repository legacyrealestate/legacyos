import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {

  const { data, error } = await supabase
    .from("maintenance_tickets")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {

  try {

    const body = await req.json();

    const payload = {
      tenant_name:
        body.caller_name,
      phone:
        body.phone,
      issue:
        body.issue,
      urgency:
        body.urgency,
      ai_summary:
        body.ai_summary,
      transcript:
        body.transcript,
      status: "Open",
    };

    const { data, error } =
      await supabase
        .from("maintenance_tickets")
        .insert(payload)
        .select()
        .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    await supabase
      .from("operations_feed")
      .insert({
        type: "call",
        title:
          `${body.urgency} Priority Call`,
        description:
          body.issue,
      });

    await supabase
      .from("notifications")
      .insert({
        title:
          body.urgency === "Emergency"
            ? "Emergency Escalation"
            : "New AI Call",
        description:
          body.issue,
      });

    if (
      body.urgency === "Emergency"
    ) {

      await supabase
        .from("operations_feed")
        .insert({
          type: "emergency",
          title:
            "Emergency Detected",
          description:
            body.issue,
        });

    }

    return NextResponse.json(data);

  } catch (e) {

    return NextResponse.json(
      {
        error:
          "Invalid request",
      },
      {
        status: 400,
      }
    );

  }
}