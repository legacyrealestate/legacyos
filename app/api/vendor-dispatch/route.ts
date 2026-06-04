export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function scoreVendor(vendor: any, text: string) {
  let score = 0;
  const keywords = vendor.dispatch_keywords || [];

  for (const keyword of keywords) {
    if (text.includes(String(keyword).toLowerCase())) score += 10;
  }

  if (vendor.priority === "Preferred") score += 5;
  if (vendor.emergency_available) score += 3;

  return score;
}

export async function POST(req: Request) {
  try {
    const { ticketId } = await req.json();

    if (!ticketId) {
      return NextResponse.json({ error: "Missing ticketId" }, { status: 400 });
    }

    const { data: ticket } = await supabase
      .from("maintenance_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const issueText = `
      ${ticket.issue || ""}
      ${ticket.ai_summary || ""}
      ${ticket.transcript || ""}
      ${ticket.urgency || ""}
    `.toLowerCase();

    const { data: vendors } = await supabase
      .from("vendors")
      .select("*");

    const ranked = (vendors || [])
      .map((vendor) => ({
        ...vendor,
        score: scoreVendor(vendor, issueText),
      }))
      .filter((vendor) => vendor.score > 0)
      .sort((a, b) => b.score - a.score);

    const selectedVendor =
      ranked[0] ||
      (vendors || []).find((vendor) => vendor.priority === "Preferred") ||
      (vendors || [])[0];

    if (!selectedVendor) {
      return NextResponse.json({ error: "No vendor available" }, { status: 404 });
    }

    const vendorPhone =
      selectedVendor.mobile_phone ||
      selectedVendor.work_phone ||
      selectedVendor.home_phone ||
      null;

    const vendorEmail =
      selectedVendor.login_email ||
      selectedVendor.alternate_email ||
      null;

    const dispatchNotes =
      `Vendor dispatched: ${selectedVendor.name}. Trade: ${selectedVendor.trade || "General"}. Contact: ${vendorPhone || vendorEmail || "No contact listed"}.`;

    const { data: updatedTicket, error: updateError } = await supabase
      .from("maintenance_tickets")
      .update({
        assigned_vendor_id: selectedVendor.id,
        assigned_vendor_name: selectedVendor.name,
        assigned_to_name: selectedVendor.name,
        assigned_to_phone: vendorPhone,
        assigned_to_email: vendorEmail,
        dispatch_status: "Dispatched",
        dispatch_notes: dispatchNotes,
        last_update: `${selectedVendor.name} was dispatched for this ticket.`,
        status: "Vendor Assigned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabase.from("vendor_jobs").insert({
      ticket_id: ticketId,
      vendor_id: selectedVendor.id,
      vendor_name: selectedVendor.name,
      issue: ticket.issue,
      tenant_name: ticket.tenant_name,
      urgency: ticket.urgency,
      status: "Dispatched",
    });

    await supabase
      .from("vendors")
      .update({
        total_dispatched: (selectedVendor.total_dispatched || 0) + 1,
        open_jobs: (selectedVendor.open_jobs || 0) + 1,
        last_dispatched_at: new Date().toISOString(),
      })
      .eq("id", selectedVendor.id);

    await supabase.from("ticket_updates").insert({
      ticket_id: ticketId,
      type: "vendor_dispatch",
      title: "Vendor Dispatched",
      description: `${selectedVendor.name} was dispatched. Contact: ${vendorPhone || vendorEmail || "No contact listed"}.`,
    });

    await supabase.from("operations_feed").insert({
      type: "vendor_dispatch",
      title: `Vendor Dispatched: ${selectedVendor.name}`,
      description: `${selectedVendor.name} assigned to ${ticket.issue}.`,
    });

    await supabase.from("notifications").insert({
      title: "Vendor Dispatched",
      description: `${selectedVendor.name} assigned to ${ticket.issue}.`,
    });

    return NextResponse.json({
      success: true,
      vendor: selectedVendor,
      ticket: updatedTicket,
      ranked,
    });
  } catch (error) {
    console.error("VENDOR DISPATCH ERROR:", error);

    return NextResponse.json(
      { error: "Vendor dispatch failed" },
      { status: 500 }
    );
  }
}
