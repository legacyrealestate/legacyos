import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { assertE164, assertOptionalString, assertOneOf, assertString, assertUuid, safeJsonObject } from "@/lib/security/validation";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const CONTACT_TYPES = ["Resident", "Owner", "Lead", "Vendor", "Other"] as const;
const CONTACT_STATUSES = ["Active", "Inactive", "Lead"] as const;

export async function GET(req: Request) {
  try {
    await requireUser();
    const search = new URL(req.url).searchParams.get("search")?.trim();
    const supabase = createServiceSupabaseClient();
    let query = supabase
      .from("crm_contacts")
      .select("*, crm_properties(id,name,address)")
      .order("last_contact_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(250);
    if (search) {
      const safe = search.replace(/[%,()]/g, "");
      query = query.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%,property_label.ilike.%${safe}%`);
    }
    const { data, error } = await query;
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
    const payload = {
      contact_type: assertOneOf(body.contactType || "Resident", CONTACT_TYPES, "contact type"),
      full_name: assertString(body.fullName, "full name", 160),
      email: assertOptionalString(body.email, "email", 254),
      phone: body.phone ? assertE164(body.phone, "phone") : null,
      property_id: body.propertyId ? assertUuid(body.propertyId, "property ID") : null,
      property_label: assertOptionalString(body.propertyLabel, "property", 250),
      unit: assertOptionalString(body.unit, "unit", 50),
      status: assertOneOf(body.status || "Active", CONTACT_STATUSES, "status"),
      notes: assertOptionalString(body.notes, "notes", 3000),
      created_by: auth.user.id,
      updated_by: auth.user.id,
    };
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from("crm_contacts").insert(payload).select().single();
    if (error) throw new ApiError(error.code === "23505" ? "conflict" : "server_error", error.message);
    return apiJson({ success: true, contact: data }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireUser();
    const body = safeJsonObject(await req.json());
    const id = assertUuid(body.id, "contact ID");
    const updates: Record<string, unknown> = { updated_by: auth.user.id, updated_at: new Date().toISOString() };
    if (body.fullName !== undefined) updates.full_name = assertString(body.fullName, "full name", 160);
    if (body.email !== undefined) updates.email = assertOptionalString(body.email, "email", 254);
    if (body.phone !== undefined) updates.phone = body.phone ? assertE164(body.phone, "phone") : null;
    if (body.status !== undefined) updates.status = assertOneOf(body.status, CONTACT_STATUSES, "status");
    if (body.notes !== undefined) updates.notes = assertOptionalString(body.notes, "notes", 3000);
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from("crm_contacts").update(updates).eq("id", id).select().single();
    if (error) throw new ApiError("server_error", error.message);
    return apiJson({ success: true, contact: data });
  } catch (error) {
    return apiError(error);
  }
}
