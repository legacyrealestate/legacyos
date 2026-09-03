import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

type TicketRiskRow = {
  property?: string | null;
  urgency?: string | null;
};

type PropertyRisk = {
  issues: number;
  emergencies: number;
  risk: "Low" | "High" | "Critical";
};

export async function GET() {
  try {
    await requireUser();
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("maintenance_tickets")
      .select("property, urgency");

    if (error) throw new ApiError("server_error", error.message);

    const grouped: Record<string, PropertyRisk> = {};
    for (const ticket of (data || []) as TicketRiskRow[]) {
      const property = ticket.property || "Unassigned";
      grouped[property] ||= { issues: 0, emergencies: 0, risk: "Low" };
      grouped[property].issues += 1;
      if (ticket.urgency === "Emergency") grouped[property].emergencies += 1;
      if (grouped[property].emergencies >= 3) grouped[property].risk = "Critical";
      else if (grouped[property].issues >= 5) grouped[property].risk = "High";
    }

    return apiJson(grouped);
  } catch (error) {
    return apiError(error);
  }
}
