export const runtime = "nodejs";

import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import {
  assertE164,
  assertOptionalString,
  assertString,
  safeJsonObject,
} from "@/lib/security/validation";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    await requireUser();
    const supabase = createServiceSupabaseClient();
    const params = new URL(req.url).searchParams;
    const limit = Math.min(Math.max(Number(params.get("limit")) || 50, 1), 100);
    const page = Math.max(Number(params.get("page")) || 1, 1);
    let query = supabase
      .from("maintenance_tickets")
      .select("*,crm_tasks(id,status,title,due_at,assigned_to),ticket_updates(id,type,title,description,created_at,created_by)")
      .order(params.get("sort") === "oldest" ? "created_at" : params.get("sort") === "urgency" ? "urgency" : "created_at", { ascending: params.get("sort") === "oldest" })
      .range((page - 1) * limit, page * limit - 1);
    for (const field of ["urgency", "status", "property", "direction", "call_status", "provider_agent_id", "call_outcome", "follow_up_status", "employee_assignee", "contact_id"] as const) {
      const value = params.get(field); if (value) query = query.eq(field, value.slice(0, 250));
    }
    const from = params.get("from"), to = params.get("to"), search = params.get("q")?.slice(0, 100);
    if (from) query = query.gte("call_started_at", from);
    if (to) query = query.lte("call_started_at", to);
    if (search) { const safe=search.replace(/[%_,()]/g, ""); query = query.or(`tenant_name.ilike.%${safe}%,phone.ilike.%${safe}%,transcript.ilike.%${safe}%,issue.ilike.%${safe}%,property.ilike.%${safe}%`); }
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

    const payload = {
      tenant_name: assertString(body.residentName, "resident name", 120),
      phone: assertE164(body.phone, "phone"),
      property: assertString(body.property, "property/address", 250),
      unit: assertOptionalString(body.unit, "unit", 50),
      issue_category: assertString(body.issueCategory, "issue category", 120),
      issue: assertString(body.issueDetails, "issue details", 2000),
      urgency: assertString(body.urgency, "urgency", 40),
      permission_to_enter: assertString(body.permissionToEnter, "permission to enter", 120),
      status: "Needs Review",
      source: "staff_form",
      created_by: auth.user.id,
      updated_by: auth.user.id,
    };

    const { data, error } = await supabase
      .from("maintenance_tickets")
      .insert(payload)
      .select()
      .single();

    if (error) throw new ApiError("server_error", error.message);

    const updates = await Promise.all([
      supabase.from("ticket_updates").insert({
        ticket_id: data.id,
        type: "intake",
        title: "Maintenance Request Created",
        description: payload.issue,
        created_by: auth.user.id,
      }),
      supabase.from("operations_feed").insert({
        type: "maintenance_request",
        title: `${payload.urgency} maintenance request`,
        description: payload.issue,
        related_ticket_id: data.id,
        created_by: auth.user.id,
      }),
      ...(payload.urgency === "Emergency"
        ? [
            supabase.from("notifications").insert({
              title: "Emergency Review Required",
              description:
                "Emergency maintenance intake was created. External emergency procedures remain required.",
              type: "emergency",
              related_ticket_id: data.id,
            }),
          ]
        : []),
    ]);

    const failed = updates.find((result) => result.error);
    if (failed?.error) throw new ApiError("server_error", failed.error.message);

    return apiJson({ success: true, data }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
