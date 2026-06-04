"use client";

import { useEffect, useState } from "react";
import AppShell from "@/app/components/AppShell";

export default function MaintenancePage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadTickets = async () => {
    try {
      const res = await fetch("/api/calls");
      const data = await res.json();
      setTickets(data || []);
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const dispatchVendor = async (ticketId: string) => {
    try {
      setProcessingId(ticketId);

      await fetch("/api/vendor-dispatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticketId }),
      });

      await loadTickets();
    } catch (error) {
      console.error(error);
    }

    setProcessingId(null);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">
          <p className="text-zinc-500">Loading maintenance...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">
        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">
          Infrastructure Operations
        </p>

        <h1 className="text-[38px] md:text-[56px] font-semibold tracking-tight mt-5">
          Maintenance
        </h1>

        <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
          Track maintenance tickets, assigned vendors, dispatch status,
          contact details, and operational updates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
        <MetricCard title="Open Tickets" value={tickets.length} />
        <MetricCard
          title="Emergencies"
          value={tickets.filter((t) => t.urgency === "Emergency").length}
        />
        <MetricCard
          title="Assigned"
          value={tickets.filter((t) => t.assigned_vendor_name).length}
        />
        <MetricCard
          title="Not Dispatched"
          value={tickets.filter((t) => !t.assigned_vendor_name).length}
        />
      </div>

      <div className="space-y-6 mt-8">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="rounded-[34px] border border-black/[0.06] bg-white p-8"
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-[28px] font-semibold tracking-tight">
                    {ticket.issue || "Maintenance Request"}
                  </h2>

                  <div className="h-[30px] px-4 rounded-full bg-black text-white text-[10px] flex items-center">
                    {ticket.urgency || "Normal"}
                  </div>
                </div>

                <p className="text-zinc-500 text-[14px] mt-4">
                  {ticket.tenant_name || "Unknown Tenant"}
                </p>

                <p className="text-zinc-400 text-[12px] mt-2">
                  Phone: {ticket.phone || "Not provided"}
                </p>
              </div>

              <div className="rounded-[20px] border border-black/[0.06] bg-[#fafafa] px-5 py-4 min-w-[190px]">
                <p className="text-zinc-400 text-[10px] uppercase tracking-[0.2em]">
                  Status
                </p>

                <p className="text-[14px] font-medium mt-2">
                  {ticket.status || "Open"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
              <InfoCard
                title="Assigned Vendor"
                main={ticket.assigned_vendor_name || "No vendor assigned"}
                sub={ticket.dispatch_status || "Not Dispatched"}
              />

              <InfoCard
                title="Vendor Contact"
                main={ticket.assigned_to_phone || "No phone added"}
                sub={ticket.assigned_to_email || "No email added"}
              />

              <InfoCard
                title="Latest Update"
                main={ticket.last_update || "No updates yet"}
                sub={ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : ""}
              />
            </div>

            <div className="rounded-[26px] border border-black/[0.06] bg-[#fafafa] p-6 mt-5">
              <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
                Dispatch Notes
              </p>

              <p className="text-zinc-700 text-[14px] leading-relaxed mt-4">
                {ticket.dispatch_notes || "No vendor dispatch has been recorded yet."}
              </p>
            </div>

            <div className="rounded-[26px] border border-black/[0.06] bg-[#fafafa] p-6 mt-5">
              <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
                Tenant Transcript / Notes
              </p>

              <p className="text-zinc-600 text-[14px] leading-relaxed mt-4 whitespace-pre-wrap">
                {ticket.transcript || ticket.ai_summary || "No transcript available."}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 mt-8">
              <button
                onClick={() => dispatchVendor(ticket.id)}
                disabled={processingId === ticket.id}
                className="h-[52px] px-6 rounded-2xl bg-black text-white text-[14px] disabled:opacity-50"
              >
                {processingId === ticket.id
                  ? "Dispatching..."
                  : ticket.assigned_vendor_name
                    ? "Re-Dispatch Vendor"
                    : "Dispatch Vendor"}
              </button>

              <button className="h-[52px] px-6 rounded-2xl border border-black/[0.08] bg-[#fafafa] text-[14px]">
                AI Analysis
              </button>

              <button className="h-[52px] px-6 rounded-2xl border border-black/[0.08] bg-[#fafafa] text-[14px]">
                Mark Resolved
              </button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-[30px] border border-black/[0.06] bg-white p-7">
      <p className="uppercase tracking-[0.24em] text-zinc-400 text-[10px]">
        {title}
      </p>
      <h2 className="text-[42px] font-semibold tracking-tight mt-5">{value}</h2>
    </div>
  );
}

function InfoCard({
  title,
  main,
  sub,
}: {
  title: string;
  main: string;
  sub: string;
}) {
  return (
    <div className="rounded-[26px] border border-black/[0.06] bg-[#fafafa] p-6">
      <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
        {title}
      </p>
      <h3 className="text-[20px] font-semibold mt-4">{main}</h3>
      <p className="text-zinc-500 text-[13px] mt-3">{sub}</p>
    </div>
  );
}
