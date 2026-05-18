"use client";

import { useEffect, useState } from "react";

import AppShell from "@/app/components/AppShell";
import VendorDispatchModal from "@/app/components/VendorDispatchModal";

type Call = {
  id: string;
  tenant_name: string;
  phone: string;
  issue: string;
  urgency: string;
  ai_summary: string;
  transcript: string;
  status: string;
  assigned_vendor: string;
};

export default function CallsPage() {

  const [calls, setCalls] =
    useState<Call[]>([]);

  const [
    selectedTicket,
    setSelectedTicket,
  ] = useState<string | null>(
    null
  );

  const [loading, setLoading] =
    useState(true);

  const [analyzingId, setAnalyzingId] =
    useState<string | null>(null);

  useEffect(() => {

    loadCalls();

  }, []);

  const loadCalls = async () => {

    const res =
      await fetch("/api/calls");

    const data =
      await res.json();

    setCalls(data || []);
    setLoading(false);

  };

  const runAutonomousEscalation =
    async (
      ticketId: string
    ) => {

      await fetch(
        "/api/escalation",
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

      loadCalls();

    };

  const analyzeCall =
    async (
      callId: string,
      transcript: string
    ) => {

      try {

        setAnalyzingId(callId);

        const res =
          await fetch(
            "/api/analyze",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                transcript,
              }),
            }
          );

        const data =
          await res.json();

        alert(
          data.analysis
        );

      } catch (error) {

        console.error(error);

      }

      setAnalyzingId(null);

    };

  return (
    <AppShell>

      {/* HERO */}

      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">

        <div className="flex items-start justify-between">

          <div>

            <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">
              Autonomous Voice Infrastructure
            </p>

            <h1 className="text-[56px] font-semibold tracking-tight mt-5">
              AI Calls
            </h1>

            <p className="text-zinc-500 text-[16px] leading-relaxed mt-5 max-w-3xl">
              AI-powered maintenance intake,
              emergency escalation, operational
              coordination, and autonomous vendor
              dispatching infrastructure.
            </p>

          </div>

          <div className="h-[42px] px-5 rounded-full bg-black text-white text-[12px] flex items-center">
            LIVE OPS
          </div>

        </div>

      </div>

      {/* STATS */}

      <div className="grid grid-cols-4 gap-5 mt-8">

        <StatCard
          title="Total Calls"
          value={calls.length}
        />

        <StatCard
          title="Emergencies"
          value={
            calls.filter(
              (c) =>
                c.urgency ===
                "Emergency"
            ).length
          }
        />

        <StatCard
          title="Escalated"
          value={
            calls.filter(
              (c) =>
                c.status?.includes(
                  "Escalated"
                )
            ).length
          }
        />

        <StatCard
          title="Assigned"
          value={
            calls.filter(
              (c) =>
                c.assigned_vendor
            ).length
          }
        />

      </div>

      {/* LOADING */}

      {loading && (

        <div className="rounded-[32px] border border-black/[0.06] bg-white p-10 mt-8">

          <p className="text-zinc-500 text-[15px]">
            Loading operational infrastructure...
          </p>

        </div>

      )}

      {/* CALLS */}

      <div className="space-y-5 mt-8">

        {calls.map((call) => (

          <div
            key={call.id}
            className="rounded-[34px] border border-black/[0.06] bg-white p-8"
          >

            {/* HEADER */}

            <div className="flex items-start justify-between">

              <div>

                <div className="flex items-center gap-3">

                  <h2 className="text-[28px] font-semibold tracking-tight">
                    {call.tenant_name}
                  </h2>

                  {call.urgency ===
                    "Emergency" && (

                    <div className="h-[32px] px-4 rounded-full bg-red-500 text-white text-[11px] flex items-center">
                      EMERGENCY
                    </div>

                  )}

                </div>

                <p className="text-zinc-500 text-[14px] mt-3">
                  {call.phone}
                </p>

              </div>

              <div className="flex gap-3">

                <div className="h-[38px] px-5 rounded-full bg-black text-white flex items-center text-[12px]">
                  {call.urgency}
                </div>

                <div className="h-[38px] px-5 rounded-full border border-black/[0.08] bg-[#fafafa] flex items-center text-[12px]">
                  {call.status}
                </div>

              </div>

            </div>

            {/* ISSUE */}

            <div className="mt-8">

              <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
                Maintenance Issue
              </p>

              <p className="text-zinc-700 text-[15px] leading-relaxed mt-4">
                {call.issue}
              </p>

            </div>

            {/* AI SUMMARY */}

            <div className="rounded-[24px] border border-black/[0.06] bg-[#fafafa] p-6 mt-8">

              <div className="flex items-center justify-between">

                <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
                  AI Operational Summary
                </p>

                <div className="h-[28px] px-3 rounded-full bg-black text-white text-[10px] flex items-center">
                  AI
                </div>

              </div>

              <p className="text-zinc-600 text-[14px] leading-relaxed mt-4 whitespace-pre-wrap">
                {call.ai_summary}
              </p>

            </div>

            {/* TRANSCRIPT */}

            <div className="rounded-[24px] border border-black/[0.06] bg-[#fafafa] p-6 mt-5">

              <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
                Full Transcript
              </p>

              <p className="text-zinc-600 text-[14px] leading-relaxed whitespace-pre-wrap mt-4 max-h-[240px] overflow-y-auto">
                {call.transcript}
              </p>

            </div>

            {/* VENDOR */}

            <div className="rounded-[24px] border border-black/[0.06] bg-[#fafafa] p-6 mt-5">

              <div className="flex items-center justify-between">

                <div>

                  <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
                    Assigned Vendor
                  </p>

                  <p className="text-zinc-700 text-[15px] mt-4">
                    {call.assigned_vendor ||
                      "No Vendor Assigned"}
                  </p>

                </div>

                <div className="h-[34px] px-4 rounded-full border border-black/[0.08] bg-white text-[12px] flex items-center">
                  Live Dispatch
                </div>

              </div>

            </div>

            {/* ACTIONS */}

            <div className="flex flex-wrap gap-4 mt-8">

              <button
                onClick={() =>
                  setSelectedTicket(
                    call.id
                  )
                }
                className="h-[50px] px-6 rounded-2xl bg-black text-white text-[14px] font-medium"
              >
                Dispatch Vendor
              </button>

              <button
                onClick={() =>
                  runAutonomousEscalation(
                    call.id
                  )
                }
                className="h-[50px] px-6 rounded-2xl border border-black/[0.08] bg-[#fafafa] text-[14px] font-medium"
              >
                Auto Escalate
              </button>

              <button
                onClick={() =>
                  analyzeCall(
                    call.id,
                    call.transcript
                  )
                }
                disabled={
                  analyzingId ===
                  call.id
                }
                className="h-[50px] px-6 rounded-2xl border border-black/[0.08] bg-[#fafafa] text-[14px] font-medium disabled:opacity-50"
              >
                {analyzingId ===
                call.id
                  ? "Analyzing..."
                  : "AI Analyze"}
              </button>

            </div>

          </div>

        ))}

      </div>

      {/* MODAL */}

      {selectedTicket && (

        <VendorDispatchModal
          ticketId={
            selectedTicket
          }
          onClose={() =>
            setSelectedTicket(
              null
            )
          }
        />

      )}

    </AppShell>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {

  return (
    <div className="rounded-[28px] border border-black/[0.06] bg-white p-7">

      <p className="uppercase tracking-[0.24em] text-zinc-400 text-[10px]">
        {title}
      </p>

      <h2 className="text-[42px] font-semibold tracking-tight mt-5">
        {value}
      </h2>

    </div>
  );
}