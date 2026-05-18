"use client";

import AppShell from "@/app/components/AppShell";

export default function AnalyticsPage() {
  return (
    <AppShell>

      <div className="rounded-[36px] border border-black/[0.06] bg-white p-10">

        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">
          Operational Intelligence
        </p>

        <h1 className="text-[52px] font-semibold tracking-tight mt-5">
          Analytics
        </h1>

        <p className="text-zinc-500 text-[16px] mt-5 max-w-2xl leading-relaxed">
          Infrastructure analytics, operational metrics,
          AI performance visibility, and property insights.
        </p>

      </div>

      <div className="grid grid-cols-4 gap-5 mt-8">

        <Metric label="Calls Today" value="184" />
        <Metric label="Resolved Issues" value="92%" />
        <Metric label="Avg Response" value="4m" />
        <Metric label="AI Accuracy" value="98%" />

      </div>

    </AppShell>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[30px] border border-black/[0.06] bg-white p-8">

      <p className="uppercase tracking-[0.22em] text-zinc-400 text-[11px]">
        {label}
      </p>

      <h2 className="text-[42px] font-semibold tracking-tight mt-6">
        {value}
      </h2>

    </div>
  );
}