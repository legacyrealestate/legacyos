"use client";

import { useEffect, useState } from "react";

import AppShell from "@/app/components/AppShell";

export default function LeasingPage() {

  const [leads, setLeads] =
    useState<any[]>([]);

  const loadLeads =
    async () => {

      const res =
        await fetch(
          "/api/leasing"
        );

      const data =
        await res.json();

      setLeads(data || []);

    };

  useEffect(() => {

    loadLeads();

  }, []);

  return (
    <AppShell>

      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">

        <p className="uppercase tracking-[0.25em] text-zinc-400 text-[10px]">
          Leasing Operations
        </p>

        <h1 className="text-[58px] font-semibold tracking-tight mt-5">
          Leasing Leads
        </h1>

      </div>

      <div className="space-y-5 mt-8">

        {leads.map(
          (lead: any) => (

            <div
              key={lead.id}
              className="rounded-[34px] border border-black/[0.06] bg-white p-8"
            >

              <div className="flex items-center justify-between gap-5">

                <div>

                  <h2 className="text-[24px] font-semibold">
                    {lead.caller}
                  </h2>

                  <p className="text-zinc-500 text-[14px] mt-3">
                    {lead.ai_summary}
                  </p>

                </div>

                <div className="h-[32px] px-4 rounded-full bg-black text-white text-[10px] flex items-center">
                  NEW LEAD
                </div>

              </div>

              <div className="rounded-[28px] border border-black/[0.06] bg-[#fafafa] p-6 mt-6">

                <p className="text-zinc-700 text-[14px] whitespace-pre-wrap">
                  {lead.transcript}
                </p>

              </div>

              <div className="flex flex-wrap gap-4 mt-6">

                <button className="h-[54px] px-6 rounded-2xl bg-black text-white text-[14px]">
                  Schedule Tour
                </button>

                <button className="h-[54px] px-6 rounded-2xl border border-black/[0.08] bg-[#fafafa] text-[14px]">
                  Email Follow Up
                </button>

              </div>

            </div>

          )
        )}

      </div>

    </AppShell>
  );
}