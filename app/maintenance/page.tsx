"use client";

import { useEffect, useState } from "react";

import AppShell from "@/app/components/AppShell";

import useRealtime from "@/app/hooks/useRealtime";

import AiAnalysisModal from "@/app/components/AiAnalysisModal";

import VendorDispatchModal from "@/app/components/VendorDispatchModal";

export default function MaintenancePage() {

  const [tickets, setTickets] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [analysisOpen, setAnalysisOpen] =
    useState(false);

  const [dispatchOpen, setDispatchOpen] =
    useState(false);

  const [selectedTicket, setSelectedTicket] =
    useState<any>(null);

  const loadTickets =
    async () => {

      try {

        const res =
          await fetch(
            "/api/calls"
          );

        const data =
          await res.json();

        setTickets(data || []);

      } catch (error) {

        console.error(error);

      }

      setLoading(false);

    };

  useEffect(() => {

    loadTickets();

  }, []);

  useRealtime(
    "maintenance_tickets",
    loadTickets
  );

  const escalateTicket =
    async (
      ticketId: string
    ) => {

      await fetch(
        "/api/escalate",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            ticketId,
          }),
        }
      );

      loadTickets();

    };

  const resolveTicket =
    async (
      ticketId: string
    ) => {

      await fetch(
        "/api/resolve",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            ticketId,
          }),
        }
      );

      loadTickets();

    };

  return (
    <AppShell>

      <AiAnalysisModal
        open={analysisOpen}
        onClose={() =>
          setAnalysisOpen(false)
        }
        data={
          selectedTicket
            ?.ai_summary
        }
      />

    <VendorDispatchModal
  open={dispatchOpen}
  ticketId={
    selectedTicket?.id
  }
  onClose={() =>
    setDispatchOpen(false)
  }
/>

      {/* HERO */}

      <div className="rounded-[40px] border border-black/[0.06] bg-white p-6 md:p-10">

        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">

          <div>

            <p className="uppercase tracking-[0.28em] text-zinc-400 text-[10px]">
              Infrastructure Operations
            </p>

            <h1 className="text-[38px] md:text-[58px] font-semibold tracking-tight mt-5">
              Maintenance
            </h1>

            <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
              Autonomous maintenance operations,
              emergency escalations,
              vendor coordination,
              and AI infrastructure management.
            </p>

          </div>

          <div className="h-[44px] px-5 rounded-full bg-black text-white text-[11px] flex items-center justify-center">
            LIVE OPERATIONS
          </div>

        </div>

      </div>

      {/* GRID */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mt-8">

        <MetricCard
          title="Open Tickets"
          value={tickets.length}
        />

        <MetricCard
          title="Emergencies"
          value={
            tickets.filter(
              (ticket) =>
                ticket.urgency ===
                "Emergency"
            ).length
          }
        />

        <MetricCard
          title="Escalated"
          value={
            tickets.filter(
              (ticket) =>
                ticket.status?.includes(
                  "Escalated"
                )
            ).length
          }
        />

        <MetricCard
          title="Resolved"
          value={
            tickets.filter(
              (ticket) =>
                ticket.status ===
                "Resolved"
            ).length
          }
        />

      </div>

      {/* LOADING */}

      {loading && (

        <div className="rounded-[34px] border border-black/[0.06] bg-white p-10 mt-8">

          <p className="text-zinc-500">
            Loading maintenance operations...
          </p>

        </div>

      )}

      {/* TICKETS */}

      <div className="space-y-5 mt-8">

        {tickets.map(
          (ticket) => (

            <div
              key={ticket.id}
              className="rounded-[34px] border border-black/[0.06] bg-white p-6 md:p-8 hover:scale-[1.01] transition-all duration-300 ease-out"
            >

              <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">

                <div>

                  <div className="flex items-center gap-3 flex-wrap">

                    <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight">
                      {
                        ticket.issue
                      }
                    </h2>

                    <div className="h-[32px] px-4 rounded-full bg-black text-white text-[10px] flex items-center">
                      {
                        ticket.urgency
                      }
                    </div>

                  </div>

                  <p className="text-zinc-500 text-[14px] mt-5">
                    {
                      ticket.tenant_name
                    }
                  </p>

                  <p className="text-zinc-400 text-[12px] mt-2">
                    Property:{" "}
                    {
                      ticket.property
                    }
                  </p>

                </div>

                <div className="rounded-[24px] border border-black/[0.06] bg-[#fafafa] px-5 py-4">

                  <p className="uppercase tracking-[0.2em] text-zinc-400 text-[10px]">
                    Status
                  </p>

                  <p className="text-[14px] font-medium mt-2">
                    {
                      ticket.status
                    }
                  </p>

                </div>

              </div>

              {/* TRANSCRIPT */}

              <div className="rounded-[28px] border border-black/[0.06] bg-[#fafafa] p-6 mt-8">

                <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
                  Tenant Transcript
                </p>

                <p className="text-zinc-700 text-[14px] leading-relaxed mt-5 whitespace-pre-wrap">
                  {
                    ticket.transcript
                  }
                </p>

              </div>

              {/* BUTTONS */}

              <div className="flex flex-wrap gap-4 mt-8">

                <button
                  onClick={() => {

                    setSelectedTicket(
                      ticket
                    );

                    setAnalysisOpen(
                      true
                    );

                  }}
                  className="h-[54px] px-6 rounded-2xl bg-black text-white text-[14px] font-medium transition-all duration-300 ease-out hover:scale-[1.02]"
                >
                  AI Analysis
                </button>

                <button
                  onClick={() => {

                    setSelectedTicket(
                      ticket
                    );

                    setDispatchOpen(
                      true
                    );

                  }}
                  className="h-[54px] px-6 rounded-2xl border border-black/[0.08] bg-[#fafafa] text-[14px] transition-all duration-300 ease-out hover:scale-[1.02]"
                >
                  Dispatch Vendor
                </button>

                <button
                  onClick={() =>
                    escalateTicket(
                      ticket.id
                    )
                  }
                  className="h-[54px] px-6 rounded-2xl border border-black/[0.08] bg-[#fafafa] text-[14px] transition-all duration-300 ease-out hover:scale-[1.02]"
                >
                  Escalate
                </button>

                <button
                  onClick={() =>
                    resolveTicket(
                      ticket.id
                    )
                  }
                  className="h-[54px] px-6 rounded-2xl border border-black/[0.08] bg-[#fafafa] text-[14px] transition-all duration-300 ease-out hover:scale-[1.02]"
                >
                  Mark Resolved
                </button>

              </div>

            </div>

          )
        )}

      </div>

    </AppShell>
  );
}

function MetricCard({
  title,
  value,
}: any) {

  return (
    <div className="rounded-[30px] border border-black/[0.06] bg-white p-7">

      <p className="uppercase tracking-[0.24em] text-zinc-400 text-[10px]">
        {title}
      </p>

      <h2 className="text-[42px] font-semibold tracking-tight mt-5">
        {value}
      </h2>

    </div>
  );
}