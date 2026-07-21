import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import {
  STAFF_TICKET_STATUSES,
  isStaffControlledTicketStatus,
} from "@/lib/workflows/dispatch-state";
import {
  assertOptionalString,
  assertUuid,
  safeJsonObject,
} from "@/lib/security/validation";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

type TicketContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: TicketContext) {
  try {
    await requireUser();
    const params = await context.params;
    const ticketId = assertUuid(params.id);
    const supabase = createServiceSupabaseClient();

    const [ticketResult, updatesResult] = await Promise.all([
      supabase.from("maintenance_tickets").select("*").eq("id", ticketId).single(),
      supabase
        .from("ticket_updates")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true }),
    ]);

    if (ticketResult.error) throw new ApiError("not_found", "Ticket not found.");
    if (updatesResult.error) throw new ApiError("server_error", updatesResult.error.message);

    return apiJson({
      success: true,
      ticket: ticketResult.data,
      updates: updatesResult.data || [],
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: Request, context: TicketContext) {
  try {
    const auth = await requireUser();
    const params = await context.params;
    const ticketId = assertUuid(params.id);
    const body = safeJsonObject(await req.json());
    const action = typeof body.action === "string" ? body.action : "status_update";
    const status = typeof body.status === "string" ? body.status : null;
    const note = assertOptionalString(body.note, "note", 2000);
    const supabase = createServiceSupabaseClient();

    const nextStatus = status;

    if (action === "call_update") {
      const update: Record<string, unknown> = { updated_by: auth.user.id, updated_at: new Date().toISOString() };
      if ("employeeAssignee" in body) update.employee_assignee = body.employeeAssignee === null ? null : assertUuid(body.employeeAssignee, "employee assignee");
      if ("contactId" in body) update.contact_id = body.contactId === null ? null : assertUuid(body.contactId, "contact");
      if ("property" in body) update.property = assertOptionalString(body.property, "property", 250);
      if ("followUpStatus" in body) {
        const value = assertOptionalString(body.followUpStatus, "follow-up status", 40);
        if (value && !["none", "queued", "open", "in_progress", "completed"].includes(value)) throw new ApiError("bad_request", "Invalid follow-up status.");
        update.follow_up_status = value || "none";
      }
      if ("internalNotes" in body) update.internal_notes = assertOptionalString(body.internalNotes, "internal notes", 10000);
      if ("callOutcome" in body) update.call_outcome = assertOptionalString(body.callOutcome, "call outcome", 120);
      const fields = Object.keys(update).filter(key => !["updated_by", "updated_at"].includes(key));
      if (!fields.length) throw new ApiError("bad_request", "No call fields were provided.");
      const { data, error } = await supabase.from("maintenance_tickets").update(update).eq("id", ticketId).select().single();
      if (error) throw new ApiError("server_error", "Unable to update call workspace.");
      await Promise.all([
        supabase.from("ticket_updates").insert({ ticket_id: ticketId, type: "staff_note", title: "Call workspace updated", description: note || `Updated ${fields.join(", ")}`, created_by: auth.user.id }),
        supabase.from("audit_logs").insert({ actor_id: auth.user.id, action: "call.workspace_updated", entity_type: "maintenance_ticket", entity_id: ticketId, detail: { fields } }),
      ]);
      return apiJson({ success: true, ticket: data });
    } else if (action === "manual_contact") {
      if (!note) throw new ApiError("bad_request", "A staff note is required for manual vendor contact.");
      const { data, error } = await supabase.rpc("record_manual_vendor_contact", {
        ticket_id_input: ticketId,
        actor_id_input: auth.user.id,
        note_input: note,
      });
      if (error) throw new ApiError("server_error", error.message);
      return apiJson({ success: true, ticket: data });
    } else if (nextStatus === "Emergency Escalated") {
      const { error } = await supabase.rpc("escalate_ticket_emergency", {
        ticket_id_input: ticketId,
        actor_id_input: auth.user.id,
      });
      if (error) throw new ApiError("server_error", error.message);
      return apiJson({ success: true });
    } else if (!nextStatus || !isStaffControlledTicketStatus(nextStatus)) {
      throw new ApiError(
        "bad_request",
        `Staff status must be one of: ${STAFF_TICKET_STATUSES.join(", ")}.`
      );
    }

    const { data, error } = await supabase.rpc("update_ticket_staff_status", {
      ticket_id_input: ticketId,
      actor_id_input: auth.user.id,
      status_input: nextStatus,
      note_input: note,
    });
    if (error) throw new ApiError("server_error", error.message);

    return apiJson({ success: true, ticket: data });
  } catch (error) {
    return apiError(error);
  }
}
