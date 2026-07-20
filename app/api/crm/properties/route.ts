import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { assertOptionalString, assertOneOf, assertString, assertUuid, safeJsonObject } from "@/lib/security/validation";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const PROPERTY_STATUSES = ["Active", "Inactive", "Onboarding"] as const;

export async function GET() {
  try {
    await requireUser();
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("crm_properties")
      .select("*, crm_contacts(count)")
      .order("name")
      .limit(250);
    if (error) throw new ApiError("server_error", error.message);
    return apiJson(data || []);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    const body = safeJsonObject(await req.json());
    const units = Number(body.units || 0);
    if (!Number.isInteger(units) || units < 0 || units > 100000) throw new ApiError("bad_request", "Invalid unit count.");
    const payload = {
      name: assertString(body.name, "property name", 160),
      address: assertString(body.address, "address", 250),
      city: assertOptionalString(body.city, "city", 100),
      state: assertOptionalString(body.state, "state", 50),
      postal_code: assertOptionalString(body.postalCode, "postal code", 20),
      units,
      status: assertOneOf(body.status || "Active", PROPERTY_STATUSES, "status"),
      notes: assertOptionalString(body.notes, "notes", 3000),
      created_by: auth.user.id,
      updated_by: auth.user.id,
    };
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from("crm_properties").insert(payload).select().single();
    if (error) throw new ApiError("server_error", error.message);
    return apiJson({ success: true, property: data }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireUser();
    const body = safeJsonObject(await req.json());
    const id = assertUuid(body.id, "property ID");
    const updates: Record<string, unknown> = { updated_by: auth.user.id, updated_at: new Date().toISOString() };
    if (body.name !== undefined) updates.name = assertString(body.name, "property name", 160);
    if (body.address !== undefined) updates.address = assertString(body.address, "address", 250);
    if (body.status !== undefined) updates.status = assertOneOf(body.status, PROPERTY_STATUSES, "status");
    if (body.notes !== undefined) updates.notes = assertOptionalString(body.notes, "notes", 3000);
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from("crm_properties").update(updates).eq("id", id).select().single();
    if (error) throw new ApiError("server_error", error.message);
    return apiJson({ success: true, property: data });
  } catch (error) {
    return apiError(error);
  }
}
