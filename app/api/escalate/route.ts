import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { assertUuid, safeJsonObject } from "@/lib/security/validation";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    const body = safeJsonObject(await req.json());
    const ticketId = assertUuid(body.ticketId, "ticketId");
    const supabase = createServiceSupabaseClient();

    const { error } = await supabase.rpc("escalate_ticket_emergency", {
      ticket_id_input: ticketId,
      actor_id_input: auth.user.id,
    });

    if (error) throw new ApiError("server_error", error.message);

    return apiJson({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
