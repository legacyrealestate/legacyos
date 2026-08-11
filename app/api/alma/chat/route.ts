import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { assertString, safeJsonObject } from "@/lib/security/validation";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { generateAlmaResponse } from "@/lib/ai/alma";
import { retrieveKnowledge } from "@/lib/knowledge";

type LiveCitation = { type: "ticket" | "vendor" | "email" | "call" | "contact"; label: string; excerpt: string };

function compact(value: string | null | undefined, limit = 900) {
  return (value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function cite(type: LiveCitation["type"], label: string, excerpt: string): LiveCitation {
  return { type, label, excerpt: compact(excerpt, 340) };
}

function queryWords(query: string) {
  return [...new Set(query.toLowerCase().match(/[a-z0-9@.-]{3,}/g) || [])].slice(0, 24);
}

function rankForQuestion<T>(items: T[], query: string, text: (item: T) => string, limit: number) {
  const words = queryWords(query);
  const ranked = items.map((item, index) => {
    const searchable = text(item).toLowerCase();
    return { item, index, score: words.reduce((total, word) => total + (searchable.includes(word) ? 1 : 0), 0) };
  });
  const matches = ranked.filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.index - b.index);
  return (matches.length ? matches : ranked).slice(0, limit).map((item) => item.item);
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    const body = safeJsonObject(await req.json());
    const message = assertString(body.message, "message", 4000);
    const history = Array.isArray(body.history)
      ? body.history
          .filter(
            (item): item is { role: "user" | "assistant"; content: string } =>
              Boolean(item && typeof item === "object" && ["user", "assistant"].includes((item as { role?: string }).role || "") && typeof (item as { content?: unknown }).content === "string")
          )
          .map((item) => ({ role: item.role, content: item.content.slice(0, 4000) }))
      : [];
    const supabase = createServiceSupabaseClient();

    const [calls, tickets, vendors, emails, contacts, knowledge] = await Promise.all([
      supabase.from("call_records").select("id,caller_name,property_label,unit,category,urgency,emergency,status,summary,transcript,started_at").order("created_at", { ascending: false }).limit(60),
      supabase.from("maintenance_tickets").select("id,tenant_name,property,unit,issue_category,issue,urgency,status,assigned_vendor_name,ai_summary,transcript,created_at").not("status", "in", '("Resolved","Closed")').order("created_at", { ascending: false }).limit(60),
      supabase.from("vendors").select("id,name,trade,coverage_trades,phone,email,alternate_email,priority,emergency_available,active,open_jobs").eq("active", true).limit(80),
      supabase.from("email_messages").select("id,thread_id,subject,body_text,direction,provider_sent_at,status").order("provider_sent_at", { ascending: false, nullsFirst: false }).limit(60),
      supabase.from("crm_contacts").select("id,full_name,contact_type,property_label,unit,email,phone,notes,last_contact_at").order("last_contact_at", { ascending: false, nullsFirst: false }).limit(60),
      retrieveKnowledge(message, 8),
    ]);

    for (const result of [calls, tickets, vendors, emails, contacts]) {
      if (result.error) throw new ApiError("server_error", result.error.message);
    }

    const relevantTickets = rankForQuestion(tickets.data || [], message, (item) => `${item.tenant_name} ${item.property} ${item.unit} ${item.issue_category} ${item.issue} ${item.ai_summary} ${item.transcript} ${item.assigned_vendor_name}`, 8);
    const relevantCalls = rankForQuestion(calls.data || [], message, (item) => `${item.caller_name} ${item.property_label} ${item.unit} ${item.category} ${item.summary} ${item.transcript}`, 6);
    const relevantVendors = rankForQuestion(vendors.data || [], message, (item) => `${item.name} ${item.trade} ${(item.coverage_trades || []).join(" ")} ${item.email} ${item.alternate_email}`, 6);
    const relevantEmails = rankForQuestion(emails.data || [], message, (item) => `${item.subject} ${item.body_text}`, 8);
    const relevantContacts = rankForQuestion(contacts.data || [], message, (item) => `${item.full_name} ${item.contact_type} ${item.property_label} ${item.unit} ${item.email} ${item.phone} ${item.notes}`, 6);

    const citations = [
      ...knowledge,
      ...relevantTickets.map((item) => cite("ticket", `Ticket: ${item.property || "Unassigned property"}${item.unit ? ` unit ${item.unit}` : ""}`, `${item.issue_category || "Maintenance"}: ${item.issue || item.ai_summary || "No issue summary."}`)),
      ...relevantCalls.map((item) => cite("call", `Call: ${item.caller_name || "Unknown caller"}`, item.summary || item.transcript || item.category || "Call record")),
      ...relevantEmails.map((item) => cite("email", `Email: ${item.subject || "Untitled"}`, item.body_text || "Email body was not available.")),
      ...relevantVendors.map((item) => cite("vendor", `Vendor: ${item.name}`, `${item.trade || "General"} | coverage: ${(item.coverage_trades || []).join(", ") || "not listed"} | open jobs: ${item.open_jobs || 0}`)),
      ...relevantContacts.map((item) => cite("contact", `Contact: ${item.full_name}`, `${item.contact_type || "Contact"} | ${item.property_label || "No property"}${item.unit ? ` unit ${item.unit}` : ""}`)),
    ];

    const result = await generateAlmaResponse({
      message,
      history,
      context: {
        generatedAt: new Date().toISOString(),
        knowledge: knowledge.map((item) => ({ source: item.label, excerpt: item.excerpt })),
        tickets: relevantTickets.map((item) => ({ ...item, ai_summary: compact(item.ai_summary), transcript: compact(item.transcript) })),
        calls: relevantCalls.map((item) => ({ ...item, summary: compact(item.summary), transcript: compact(item.transcript) })),
        emails: relevantEmails.map((item) => ({ ...item, body_text: compact(item.body_text) })),
        vendors: relevantVendors,
        contacts: relevantContacts.map((item) => ({ ...item, notes: compact(item.notes, 500) })),
        citations: citations.map((item) => item.label),
      },
    });

    await supabase.from("command_memory").insert({
      prompt: message,
      response: result.text,
      metadata: { model: result.model, responseId: result.responseId, sources: citations.map((item) => item.label) },
      created_by: auth.user.id,
    });

    return apiJson({ success: true, message: result.text, citations });
  } catch (error) {
    return apiError(error);
  }
}
