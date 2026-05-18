"use client";

import AppShell from "@/app/components/AppShell";

export default function AIPage() {
  return (
    <AppShell>

      <div className="rounded-[36px] border border-black/[0.06] bg-white p-10">

        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">
          Cognitive Infrastructure
        </p>

        <h1 className="text-[52px] font-semibold tracking-tight mt-5">
          AI Core
        </h1>

        <p className="text-zinc-500 text-[16px] mt-5 max-w-2xl leading-relaxed">
          Central operational intelligence layer powering
          communications, automation, infrastructure routing,
          and autonomous property workflows.
        </p>

      </div>

      <div className="rounded-[34px] border border-black/[0.06] bg-white p-10 mt-8 h-[520px] flex items-center justify-center relative overflow-hidden">

        <div className="absolute w-[420px] h-[420px] rounded-full border border-black/[0.05]"></div>

        <div className="absolute w-[280px] h-[280px] rounded-full border border-black/[0.08]"></div>

        <div className="absolute w-[160px] h-[160px] rounded-full border border-black/[0.10]"></div>

        <div className="w-5 h-5 rounded-full bg-black"></div>

      </div>

    </AppShell>
  );
}