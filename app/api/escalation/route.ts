import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env
    .NEXT_PUBLIC_SUPABASE_URL!,
  process.env
    .SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: Request
) {

  const body = await req.json();

  const ticketId =
    body.ticketId;

  const { data: ticket } =
    await supabase
      .from("maintenance_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

  if (
    ticket?.urgency ===
    "Emergency"
  ) {

    await supabase
      .from(
        "maintenance_tickets"
      )
      .update({
        status:
          "Emergency Escalated",
      })
      .eq("id", ticketId);

    await supabase
      .from(
        "notifications"
      )
      .insert({
        title:
          "Emergency Escalation",
        description:
          ticket.issue,
      });

    await supabase
      .from(
        "operations_feed"
      )
      .insert({
        type:
          "emergency",
        title:
          "Emergency Escalated",
        description:
          ticket.issue,
      });

  }

  return NextResponse.json({
    success: true,
  });
}