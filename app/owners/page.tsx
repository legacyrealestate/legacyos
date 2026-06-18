"use client";

import AppShell from "@/app/components/AppShell";

export default function OwnersPage() {
  return (
    <AppShell>
      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">
        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">Owner Support</p>
        <h1 className="text-[44px] md:text-[58px] font-semibold tracking-tight mt-5">Owners</h1>
        <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
          Simple owner workflow for Legacy: organize owner requests and send owner statements.
        </p>
      </div>

      <div className="rounded-[34px] border border-black/[0.06] bg-white p-8 mt-8">
        <p className="uppercase tracking-[0.24em] text-zinc-400 text-[10px]">Primary Workflow</p>
        <h2 className="text-[32px] font-semibold tracking-tight mt-4">Send Owner Statement</h2>
        <p className="text-zinc-500 text-[14px] leading-relaxed mt-4">
          This is the only owner-specific feature requested for the launch version.
        </p>
      </div>
    </AppShell>
  );
}
