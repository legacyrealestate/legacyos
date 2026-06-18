"use client";

import AppShell from "@/app/components/AppShell";

const residentItems = [
  "Submit task for resident and ask follow-up questions to get full details.",
  "Send resident ledger.",
  "Show balance owed.",
  "Send lease if requested.",
  "Send move-out procedure.",
  "Send 30, 45, or 60 day move-out notice depending on lease.",
  "Send resident portal password reset email upon request.",
  "Explain late fee: 10% of rent regardless of amount owed.",
  "Send HOA documents if applicable."
];

export default function ResidentsPage() {
  return (
    <AppShell>
      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">
        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">Resident Support</p>
        <h1 className="text-[44px] md:text-[58px] font-semibold tracking-tight mt-5">Residents</h1>
        <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
          Resident workflows for maintenance requests, ledgers, balances, leases,
          move-out procedures, password resets, late fees, and HOA documents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
        {residentItems.map((item) => (
          <div key={item} className="rounded-[30px] border border-black/[0.06] bg-white p-7">
            <p className="text-zinc-700 text-[15px] leading-relaxed">{item}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
