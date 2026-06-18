import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const templates: Record<string, any> = {
  application: {
    title: "Application Link",
    sms: "Legacy Real Estate Group: Application fee is $55 per adult. Waverly is $30 per adult. Application link: ADD_APPLICATION_LINK_HERE",
  },
  late_fee: {
    title: "Late Fee Policy",
    sms: "Legacy Real Estate Group: The late fee is 10% of rent regardless of the amount owed.",
  },
  move_out: {
    title: "Move-Out Notice",
    sms: "Legacy Real Estate Group: Move-out notice may be 30, 45, or 60 days depending on your lease. A team member can confirm your exact requirement.",
  },
  maintenance_intake: {
    title: "Maintenance Intake",
    sms: "Legacy Real Estate Group: Please reply with your property address, issue details, when it started, photos if available, and whether maintenance has permission to enter.",
  },
  portal_reset: {
    title: "Portal Password Reset",
    sms: "Legacy Real Estate Group: We received your portal password reset request. A reset email will be sent to the email on file.",
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
  if (text.includes("late fee")) return "late_fee";
  if (text.includes("move out") || text.includes("move-out")) return "move_out";
  if (text.includes("maintenance") || text.includes("repair") || text.includes("leak")) return "maintenance_intake";
  if (text.includes("password") || text.includes("portal")) return "portal_reset";
  if (text.includes("lease")) return "lease_request";
  if (text.includes("ledger") || text.includes("balance")) return "ledger_request";
  if (text.includes("owner statement")) return "owner_statement";
  if (text.includes("hoa")) return "hoa_docs";

  return "maintenance_intake";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const transcript = body.transcript || body.message || "";
    const phone = body.phone || body.caller_number || body.to || "";
    const requestedTemplate = body.template || detectTemplate(transcript);

    const template = templates[requestedTemplate] || templates.maintenance_intake;

    await supabase.from("operations_feed").insert({
      type: "document",
      title: template.title,
      description: `Prepared SMS template for ${phone || "unknown caller"}: ${template.sms}`,
    });

    return NextResponse.json({
      success: true,
      template: requestedTemplate,
      phone,
      sms: template.sms,
      email_subject: template.title,
      email_body: template.sms,
      link: null,
      requires_verification: [
        "lease_request",
        "ledger_request",
        "owner_statement",
        "hoa_docs",
      ].includes(requestedTemplate),
    });
  } catch (error) {
    console.error("SEND DOCUMENT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}
