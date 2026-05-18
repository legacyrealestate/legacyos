import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase =
  createClient(
    process.env
      .NEXT_PUBLIC_SUPABASE_URL!,
    process.env
      .SUPABASE_SERVICE_ROLE_KEY!
  );

export async function GET() {

  const { data: tickets } =
    await supabase
      .from(
        "maintenance_tickets"
      )
      .select("*");

  const grouped: any = {};

  tickets?.forEach(
    (ticket: any) => {

      const property =
        ticket.property ||
        "Unknown Property";

      if (
        !grouped[property]
      ) {

        grouped[property] = {
          issues: 0,
          emergencies: 0,
          risk: "Low",
        };

      }

      grouped[
        property
      ].issues++;

      if (
        ticket.urgency ===
        "Emergency"
      ) {

        grouped[
          property
        ].emergencies++;

      }

      if (
        grouped[property]
          .emergencies >= 3
      ) {

        grouped[
          property
        ].risk =
          "Critical";

      } else if (
        grouped[property]
          .issues >= 5
      ) {

        grouped[
          property
        ].risk =
          "High";

      }

    }
  );

  return NextResponse.json(
    grouped
  );
}