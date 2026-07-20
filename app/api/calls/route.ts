export const runtime = "nodejs";

import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { assertE164, assertOptionalString, assertString, safeJsonObject } from "@/lib/security/validation";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { normalizeUrgency } from "@/lib/workflows/classification";

export async function GET(req: Request) {
  try {
    await requireUser();
    const params = new URL(req.url).searchParams;
    const limit = Math.min(Math.max(Number(params.get("limit")) || 100, 1), 250);
    const supabase = createServiceSupabaseClient();
    let query = supabase
      .from("call_records")
      .select("*, maintenance_tickets(*)")
      .order("started_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    const urgency = params.get("urgency");
    if (urgency && urgency !== "All") query = query.eq("urgency", urgency);
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
    const supabase = createServiceSupabaseClient();
    const issue = assertString(body.issueDetails, "issue details", 2000);
    const urgency = normalizeUrgency(body.urgency, issue);
    const payload = {
      tenant_name: assertString(body.residentName, "resident name", 120),
      phone: assertE164(body.phone, "phone"),
      property: assertString(body.property, "property/address", 250),
      unit: assertOptionalString(body.unit, "unit", 50),
      issue_category: assertString(body.issueCategory, "issue category", 120),
      issue,
      urgency,
      permission_to_enter: assertString(body.permissionToEnter, "permission to enter", 120),
      status: urgency === "Emergency" ? "Emergency Escalated" : "Needs Review",
      source: "staff_form",
      created_by: auth.user.id,
      updated_by: auth.user.id,
    };
    const { data, error } = await supabase.from("maintenance_tickets").insert(payload).select().single();
    if (error) throw new ApiError("server_error", error.message);

    const updates = await Promise.all([
      supabase.from("ticket_updates").insert({ ticket_id: data.id, type: "intake", title: "Maintenance Request Created", description: issue, created_by: auth.user.id }),
      supabase.from("operations_feed").insert({ type: "maintenance_request", title: `${urgency} maintenance request`, description: issue, related_ticket_id: data.id, created_by: auth.user.id }),
      ...(urgency === "Emergency"
        ? [supabase.from("notifications").insert({ title: "Emergency Review Required", description: "Emergency maintenance intake was created. Follow the established emergency procedure now.", type: "emergency", related_ticket_id: data.id })]
        : []),
    ]);
    const failed = updates.find((result) => result.error);
    if (failed?.error) throw new ApiError("server_error", failed.error.message);
    return apiJson({ success: true, data }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
