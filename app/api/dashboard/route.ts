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

  const { data: calls } =
    await supabase
      .from(
        "maintenance_tickets"
      )
      .select("*");

  const { data: vendors } =
    await supabase
      .from("vendors")
      .select("*");

  const {
    data: properties,
  } = await supabase
    .from("properties")
    .select("*");

  const {
    data: notifications,
  } = await supabase
    .from("notifications")
    .select("*");

  const {
    data: operations,
  } = await supabase
    .from("operations_feed")
    .select("*")
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(6);

  const emergencyCount =
    calls?.filter(
      (call) =>
        call.urgency ===
        "Emergency"
    ).length || 0;

  const escalatedCount =
    calls?.filter(
      (call) =>
        call.status?.includes(
          "Escalated"
        )
    ).length || 0;

  return NextResponse.json({
    metrics: {
      totalCalls:
        calls?.length || 0,

      emergencies:
        emergencyCount,

      escalated:
        escalatedCount,

      vendors:
        vendors?.length || 0,

      properties:
        properties?.length || 0,

      notifications:
        notifications?.length || 0,
    },

    operations:
      operations || [],

    vendors:
      vendors || [],

    properties:
      properties || [],

    calls:
      calls || [],
  });
}