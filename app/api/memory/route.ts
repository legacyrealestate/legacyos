import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {

  const { data: tenantMemory } =
    await supabase
      .from("tenant_memory")
      .select("*");

  const { data: propertyMemory } =
    await supabase
      .from("property_memory")
      .select("*");

  const { data: vendorMemory } =
    await supabase
      .from("vendor_memory")
      .select("*");

  return NextResponse.json({
    tenantMemory,
    propertyMemory,
    vendorMemory,
  });
}