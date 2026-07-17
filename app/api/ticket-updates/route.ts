export const runtime = "nodejs";

import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { assertUuid } from "@/lib/security/validation";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");
    const supabase = createServiceSupabaseClient();

    let query = supabase
      .from("ticket_updates")
      .select("*")
      .order("created_at", { ascending: false });

    if (ticketId) query = query.eq("ticket_id", assertUuid(ticketId, "ticketId"));

    const { data, error } = await query;
    if (error) throw new ApiError("server_error", error.message);

    return apiJson(data || []);
  } catch (error) {
    return apiError(error);
  }
}
