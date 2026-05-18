import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {

  await supabase
    .from("maintenance_tickets")
    .insert({
      tenant_name:
        "Simulation Tenant",

      phone:
        "(615) 555-8821",

      issue:
        "Emergency water leak from ceiling",

      urgency:
        "Emergency",

      ai_summary:
        "Potential pipe rupture detected.",

      transcript:
        "Tenant reports active flooding from upstairs ceiling.",

      status:
        "Emergency Escalated",

      property:
        "1710 Nassau St",
    });

  await supabase
    .from("notifications")
    .insert({
      title:
        "Emergency Simulation",

      description:
        "Autonomous emergency workflow triggered.",
    });

  await supabase
    .from("operations_feed")
    .insert({
      type:
        "emergency",

      title:
        "Simulation Escalation",

      description:
        "LegacyOS triggered autonomous escalation workflow.",
    });

  return NextResponse.json({
    success: true,
  });
}