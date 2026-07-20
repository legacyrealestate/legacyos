import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { assertString, safeJsonObject } from "@/lib/security/validation";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { generateAlmaResponse } from "@/lib/ai/alma";

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    const body = safeJsonObject(await req.json());
    const message = assertString(body.message, "message", 4000);
    const history = Array.isArray(body.history)
      ? body.history
          .filter(
            (item): item is { role: "user" | "assistant"; content: string } =>
              Boolean(
                item &&
                  typeof item === "object" &&
                  ["user", "assistant"].includes((item as { role?: string }).role || "") &&
                  typeof (item as { content?: unknown }).content === "string"
              )
          )
          .map((item) => ({ role: item.role, content: item.content.slice(0, 4000) }))
      : [];
    const supabase = createServiceSupabaseClient();

    const [calls, tickets, vendors, emails, contacts] = await Promise.all([
      supabase
        .from("call_records")
        .select("caller_name,category,urgency,emergency,status,summary,started_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("maintenance_tickets")
        .select("tenant_name,property,unit,issue,urgency,status,assigned_vendor_name,created_at")
        .not("status", "in", '("Resolved","Closed")')
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("vendors").select("name,trade,priority,emergency_available,active,open_jobs").eq("active", true),
      supabase
        .from("email_threads")
        .select("subject,contact_name,status,urgency,last_message_at")
        .not("status", "eq", "Closed")
        .order("last_message_at", { ascending: false })
        .limit(15),
      supabase.from("crm_contacts").select("full_name,contact_type,property_label,unit,last_contact_at").limit(20),
    ]);

    for (const result of [calls, tickets, vendors, emails, contacts]) {
      if (result.error) throw new ApiError("server_error", result.error.message);
    }

    const result = await generateAlmaResponse({
      message,
      history,
      context: {
        generatedAt: new Date().toISOString(),
        calls: calls.data || [],
        openTickets: tickets.data || [],
        activeVendors: vendors.data || [],
        openEmails: emails.data || [],
        contacts: contacts.data || [],
      },
    });

    await supabase.from("command_memory").insert({
      prompt: message,
      response: result.text,
      metadata: { model: result.model, responseId: result.responseId },
      created_by: auth.user.id,
    });

    return apiJson({ success: true, message: result.text });
  } catch (error) {
    return apiError(error);
  }
}
