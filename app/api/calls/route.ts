export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {

  try {

    const { data, error } =
      await supabase
        .from("maintenance_tickets")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

    if (error) {

      console.error(
        "GET ERROR:",
        error
      );

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );

    }

    return NextResponse.json(data);

  } catch (e) {

    console.error(
      "GET ROUTE ERROR:",
      e
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch calls",
      },
      {
        status: 500,
      }
    );

  }

}

export async function POST(
  req: Request
) {

  try {

    const body =
      await req.json();

    console.log(
      "FULL WEBHOOK BODY:",
      JSON.stringify(
        body,
        null,
        2
      )
    );

    const payload = {

      tenant_name:
        body.caller_name ||
        body.name ||
        "Unknown Caller",

      phone:
        body.phone ||
        body.phone_number ||
        "Unknown",

      issue:
        body.issue ||
        body.summary ||
        "No issue provided",

      urgency:
        body.urgency ||
        body.priority ||
        "Normal",

      ai_summary:
        body.ai_summary ||
        body.summary ||
        "No AI summary",

      transcript:
        typeof body.transcript ===
        "string"
          ? body.transcript
          : JSON.stringify(
              body.transcript ||
                body,
              null,
              2
            ),

      status: "Open",

    };

    console.log(
      "INSERT PAYLOAD:",
      JSON.stringify(
        payload,
        null,
        2
      )
    );

    const {
      data,
      error,
    } = await supabase
      .from(
        "maintenance_tickets"
      )
      .insert(payload)
      .select()
      .single();

    if (error) {

      console.error(
        "SUPABASE INSERT ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );

    }

    /*
      OPERATIONS FEED
    */

    const {
      error:
        operationsError,
    } = await supabase
      .from(
        "operations_feed"
      )
      .insert({
        type: "call",
        title:
          `${payload.urgency} Priority Call`,
        description:
          payload.issue,
      });

    if (
      operationsError
    ) {

      console.error(
        "OPERATIONS FEED ERROR:",
        operationsError
      );

    }

    /*
      NOTIFICATIONS
    */

    const {
      error:
        notificationError,
    } = await supabase
      .from(
        "notifications"
      )
      .insert({
        title:
          payload.urgency ===
          "Emergency"
            ? "Emergency Escalation"
            : "New AI Call",

        description:
          payload.issue,
      });

    if (
      notificationError
    ) {

      console.error(
        "NOTIFICATION ERROR:",
        notificationError
      );

    }

    /*
      EMERGENCY
    */

    if (
      payload.urgency ===
      "Emergency"
    ) {

      const {
        error:
          emergencyError,
      } = await supabase
        .from(
          "operations_feed"
        )
        .insert({
          type: "emergency",
          title:
            "Emergency Detected",
          description:
            payload.issue,
        });

      if (
        emergencyError
      ) {

        console.error(
          "EMERGENCY ERROR:",
          emergencyError
        );

      }

    }

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (e) {

    console.error(
      "POST ROUTE ERROR:",
      e
    );

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
