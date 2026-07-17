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

export async function GET() {
  try {
    await requireUser();
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("maintenance_tickets")
      .select("*")
      .order("created_at", { ascending: false });

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
