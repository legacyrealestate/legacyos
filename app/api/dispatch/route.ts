import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  await supabase
    .from(
      "maintenance_tickets"
    )
    .update({
      assigned_vendor:
        body.vendor,
      status:
        "Vendor Assigned",
    })
    .eq(
      "id",
      body.ticketId
    );

  await supabase
    .from(
      "operations_feed"
    )
    .insert({
      type:
        "dispatch",
      title:
        "Vendor Dispatched",
      description:
        `${body.vendor} assigned`,
    });

  await supabase
    .from(
      "notifications"
    )
    .insert({
      title:
        "Vendor Assigned",
      description:
        `${body.vendor} assigned to maintenance issue`,
    });

  return NextResponse.json({
    success: true,
  });
}