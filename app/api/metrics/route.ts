import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {

  const { count: tickets } = await supabase
    .from("maintenance_tickets")
    .select("*", { count: "exact", head: true });

  const { count: vendors } = await supabase
    .from("vendors")
    .select("*", { count: "exact", head: true });

  const { count: calls } = await supabase
    .from("maintenance_tickets")
    .select("*", { count: "exact", head: true });

  const { count: emergencies } = await supabase
    .from("maintenance_tickets")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("urgency", "Emergency");

  return NextResponse.json({
    tickets,
    vendors,
    calls,
    emergencies,
  });
}