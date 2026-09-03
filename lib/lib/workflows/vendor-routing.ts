import "server-only";

import { ApiError } from "@/lib/security/api";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export type VendorRoutingResult = {
  status: "recommended" | "held_for_emergency_review" | "no_contactable_match" | "already_routed";
  vendorId?: string;
  vendorName?: string;
};

// This only creates an internal recommendation. It never sends a vendor communication.
export async function routeTicketToVendor(ticketId: string, source: string): Promise<VendorRoutingResult> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.rpc("route_ticket_to_vendor", {
    ticket_id_input: ticketId,
    route_source_input: source,
  });

  if (error) throw new ApiError("server_error", error.message);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new ApiError("server_error", "Vendor routing did not return a valid result.");
  }

  const result = data as Record<string, unknown>;
  const status = result.status;
  if (
    status !== "recommended" &&
    status !== "held_for_emergency_review" &&
    status !== "no_contactable_match" &&
    status !== "already_routed"
  ) {
    throw new ApiError("server_error", "Vendor routing returned an unknown status.");
  }

  return {
    status,
    vendorId: typeof result.vendorId === "string" ? result.vendorId : undefined,
    vendorName: typeof result.vendorName === "string" ? result.vendorName : undefined,
  };
}
