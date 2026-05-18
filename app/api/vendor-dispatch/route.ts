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

    /*
      MOCK VENDOR
      UNTIL CLIENT PROVIDES REAL DATA
    */

    const vendor = {
      name:
        "Nashville Emergency Plumbing",

      phone:
        "(615) 555-8821",

      specialty:
        "Emergency Plumbing",
    };

    /*
      UPDATE TICKET
    */

    await supabase
      .from(
        "maintenance_tickets"
      )
      .update({
        status:
          "Vendor Dispatched",

        assigned_vendor:
          vendor.name,
      })
      .eq(
        "id",
        ticketId
      );

    /*
      OPERATIONS FEED
    */

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
          `${vendor.name} assigned to maintenance issue.`,
      });

    /*
      NOTIFICATION
    */

    await supabase
      .from(
        "notifications"
      )
      .insert({
        title:
          "Vendor Assigned",

        description:
          `${vendor.name} dispatched successfully.`,
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