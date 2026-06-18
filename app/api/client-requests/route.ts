import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("client_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, requests: data || [] });
}

export async function POST(req: Request) {
  const body = await req.json();

  const { data, error } = await supabase
    .from("client_requests")
    .insert({
      title: body.title,
      description: body.description || "",
      category: body.category || "General",
      priority: body.priority || "Medium",
      status: body.status || "Requested",
      requested_by: body.requested_by || "Legacy Team",
      notes: body.notes || "",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, request: data });
}
