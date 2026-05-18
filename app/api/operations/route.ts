import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

const supabase =
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function GET() {

  const { data } =
    await supabase
      .from(
        "operations_feed"
      )
      .select("*")
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

  return NextResponse.json(
    data || []
  );
}