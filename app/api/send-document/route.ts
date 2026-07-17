import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { assertOptionalString, assertString, safeJsonObject } from "@/lib/security/validation";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

type Template = {
  title: string;
  sms: string;
};

const templates: Record<string, Template> = {
  application: {
    title: "Application Information",
    sms: "Legacy Real Estate Group: Application fee is $55 per adult. Waverly is $30 per adult. A team member will provide the current application link after confirming the property.",
  },
  maintenance_intake: {
    title: "Maintenance Intake",
    sms: "Legacy Real Estate Group: Please reply with your property address, issue details, when it started, photos if available, and whether maintenance has permission to enter.",
  },
  lease_request: {
    title: "Lease Request",
    sms: "Legacy Real Estate Group: We received your lease request. For security, our team will verify your account before sending lease documents.",
  },
  ledger_request: {
    title: "Resident Ledger Request",
    sms: "Legacy Real Estate Group: We received your ledger request. For security, our team will verify your account before sending resident ledger information.",
  },
  owner_statement: {
    title: "Owner Statement Request",
    sms: "Legacy Real Estate Group: We received your owner statement request. Please confirm the property or owner account name so our team can send the correct statement securely.",
  },
  hoa_docs: {
    title: "HOA Documents Request",
    sms: "Legacy Real Estate Group: We received your HOA document request. A team member will confirm the correct property and document before sending.",
  },
};

function detectTemplate(message: string) {
  const text = message.toLowerCase();
  if (text.includes("application") || text.includes("apply")) return "application";
  if (text.includes("lease")) return "lease_request";
  if (text.includes("ledger") || text.includes("balance")) return "ledger_request";
  if (text.includes("owner statement")) return "owner_statement";
  if (text.includes("hoa")) return "hoa_docs";
  return "maintenance_intake";
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    const body = safeJsonObject(await req.json());
    const message = assertOptionalString(body.message, "message", 2000) || "";
    const requestedTemplate =
      assertOptionalString(body.template, "template", 80) || detectTemplate(message);
    const template = templates[requestedTemplate] || templates.maintenance_intake;
    const supabase = createServiceSupabaseClient();

    const { error } = await supabase.from("operations_feed").insert({
      type: "document_template",
      title: template.title,
      description: "Staff prepared a document-response template. No document was sent automatically.",
      created_by: auth.user.id,
    });

    if (error) throw new ApiError("server_error", error.message);

    return apiJson({
      success: true,
      template: requestedTemplate,
      sms: assertString(template.sms, "template body", 1200),
      email_subject: template.title,
      email_body: template.sms,
      link: null,
      requires_verification: ["lease_request", "ledger_request", "owner_statement", "hoa_docs"].includes(
        requestedTemplate
      ),
    });
  } catch (error) {
    return apiError(error);
  }
}
