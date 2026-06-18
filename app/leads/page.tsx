"use client";

import AppShell from "@/app/components/AppShell";

const leadItems = [
  "Speak to available and coming soon listings.",
  "Recommend homes available that fit lead criteria.",
  "Send application link.",
  "Explain application cost: $55 per adult. Waverly: $30 per adult.",
  "Explain qualification standards once script is provided.",
  "Schedule showings."
];

export default function LeadsPage() {
  return (
    <AppShell>
      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">
        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">Leasing AI</p>
        <h1 className="text-[44px] md:text-[58px] font-semibold tracking-tight mt-5">Leads</h1>
        <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
          This page is focused only on what Legacy asked for: helping new leads find homes,
          understand application costs, receive application links, and schedule showings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
        {leadItems.map((item) => (
          <div key={item} className="rounded-[30px] border border-black/[0.06] bg-white p-7">
            <p className="text-zinc-700 text-[15px] leading-relaxed">{item}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
