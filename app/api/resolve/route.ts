import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

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

    const ticketId =
      body.ticketId;

    await supabase
      .from(
        "maintenance_tickets"
      )
      .update({
        status:
          "Resolved",

        urgency:
          "Resolved",
      })
      .eq(
        "id",
        ticketId
      );

    await supabase
      .from(
        "operations_feed"
      )
      .insert({
        type:
          "resolved",

        title:
          "Maintenance Resolved",

        description:
          "Ticket resolved successfully.",
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