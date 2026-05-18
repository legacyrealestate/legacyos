"use client";

import { useEffect, useState } from "react";

import AppShell from "@/app/components/AppShell";
import useRealtime from "@/app/hooks/useRealtime";

export default function InboxPage() {

  const [calls, setCalls] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const loadCalls =
    async () => {

      try {

        const res =
          await fetch(
            "/api/calls"
          );

        const data =
          await res.json();

        setCalls(data || []);

      } catch (error) {

        console.error(error);

      }

      setLoading(false);

    };

  useEffect(() => {

    loadCalls();

  }, []);

  useRealtime(
    "maintenance_tickets",
    loadCalls
  );

  const escalate =
    async (
      id: string
    ) => {

      try {

        setProcessingId(id);

        await fetch(
          "/api/escalation",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              ticketId: id,
            }),
          }
        );

        loadCalls();

      } catch (error) {

        console.error(error);

      }

      setProcessingId(null);

    };

  if (loading) {

    return (
      <AppShell>

        <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">

          <p className="text-zinc-500">
            Loading communications...
          </p>

        </div>

      </AppShell>
    );
  }

  return (
    <AppShell>

      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">

        <div className="flex items-start justify-between gap-6">

          <div>

            <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">
              Autonomous Communications
            </p>

            <h1 className="text-[38px] md:text-[56px] font-semibold tracking-tight mt-5">
              AI Inbox
            </h1>

            <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
              Real-time tenant communication,
              operational escalations, maintenance
              intake, and AI-driven workflow
              coordination across LegacyOS.
            </p>

          </div>

          <div className="h-[42px] px-5 rounded-full bg-black text-white text-[11px] flex items-center">
            LIVE
          </div>

        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">

        <MetricCard
          title="Conversations"
          value={calls.length}
        />

        <MetricCard
          title="Emergencies"
          value={
            calls.filter(
              (call) =>
                call.urgency ===
                "Emergency"
            ).length
          }
        />

        <MetricCard
          title="Escalated"
          value={
            calls.filter(
              (call) =>
                call.status?.includes(
                  "Escalated"
                )
            ).length
          }
        />

      </div>

      {calls.length === 0 && (

        <div className="rounded-[36px] border border-black/[0.06] bg-white p-10 mt-8">

          <h2 className="text-[28px] font-semibold">
            No active conversations
          </h2>

          <p className="text-zinc-500 text-[14px] mt-4">
            LegacyOS is monitoring operational infrastructure.
          </p>

        </div>

      )}

      <div className="space-y-5 mt-8">

        {calls.map((call) => (

          <div
            key={call.id}
            className="rounded-[34px] border border-black/[0.06] bg-white p-8"
          >

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">

              <div>

                <div className="flex items-center gap-3 flex-wrap">

                  <h2 className="text-[28px] font-semibold tracking-tight">
                    {
                      call.tenant_name
                    }
                  </h2>

                  <div className="h-[32px] px-4 rounded-full bg-black text-white text-[10px] flex items-center">
                    {
                      call.urgency
                    }
                  </div>

                </div>

                <p className="text-zinc-500 text-[14px] mt-4">
                  {call.phone}
                </p>

                <p className="text-zinc-400 text-[12px] mt-2">
                  Property:{" "}
                  {call.property}
                </p>

              </div>

              <div className="rounded-[20px] border border-black/[0.06] bg-[#fafafa] px-5 py-4">

                <p className="text-zinc-400 text-[10px] uppercase tracking-[0.2em]">
                  Status
                </p>

                <p className="text-[14px] font-medium mt-2">
                  {call.status}
                </p>

              </div>

            </div>

            <div className="rounded-[26px] border border-black/[0.06] bg-[#fafafa] p-6 mt-8">

              <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
                Maintenance Issue
              </p>

              <p className="text-zinc-700 text-[15px] leading-relaxed mt-4">
                {call.issue}
              </p>

            </div>

            <div className="rounded-[26px] border border-black/[0.06] bg-[#fafafa] p-6 mt-5">

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

            <div className="rounded-[26px] border border-black/[0.06] bg-[#fafafa] p-6 mt-5">

              <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
                Transcript
              </p>

              <p className="text-zinc-600 text-[14px] leading-relaxed mt-4 whitespace-pre-wrap">
                {call.transcript}
              </p>

            </div>

            <div className="flex flex-wrap gap-4 mt-8">

              <button
                className="h-[52px] px-6 rounded-2xl bg-black text-white text-[14px]"
              >
                AI Reply
              </button>

              <button
                className="h-[52px] px-6 rounded-2xl border border-black/[0.08] bg-[#fafafa] text-[14px]"
              >
                Create Ticket
              </button>

              <button
                onClick={() =>
                  escalate(
                    call.id
                  )
                }
                disabled={
                  processingId ===
                  call.id
                }
                className="h-[52px] px-6 rounded-2xl border border-black/[0.08] bg-[#fafafa] text-[14px] disabled:opacity-50"
              >
                {processingId ===
                call.id
                  ? "Escalating..."
                  : "Escalate"}
              </button>

            </div>

          </div>

        ))}

      </div>

    </AppShell>
  );
}

function MetricCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {

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