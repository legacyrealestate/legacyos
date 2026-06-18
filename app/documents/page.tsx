"use client";

import AppShell from "@/app/components/AppShell";

const sections = [
  {
    title: "For Leads",
    items: [
      "Speak to available and coming soon listings",
      "Recommend homes that fit lead criteria",
      "Send application link and application cost",
      "$55 per adult / Waverly $30 per adult",
      "Qualification standards script",
      "Schedule showings"
    ]
  },
  {
    title: "For Owners",
    items: [
      "Send owner statement"
    ]
  },
  {
    title: "For Residents",
    items: [
      "Submit resident task and ask detailed follow-up questions",
      "Send resident ledger",
      "Show balance owed",
      "Send lease if requested",
      "Send move-out procedure",
      "Send 30, 45, or 60 day move-out notice depending on lease",
      "Send resident portal password reset email",
      "Explain late fee: 10% of rent regardless of amount owed",
      "Send HOA documents if applicable"
    ]
  },
  {
    title: "Next Phase",
    items: [
      "Microphone commands into LegacyOS",
      "AI fills out leases",
      "Send balance notices",
      "Call residents with balances and attempt payment plans",
      "AI documents leads and nurtures follow-up calls/emails"
    ]
  }
];

export default function DocumentsPage() {
  return (
    <AppShell>
      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">
        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">
          LegacyOS Client Scope
        </p>
        <h1 className="text-[44px] md:text-[58px] font-semibold tracking-tight mt-5">
          AI Operations Workflows
        </h1>
        <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
          Built around Legacy Nashville’s requested workflows for leads, owners, residents, maintenance, documents, and AI follow-up.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
        {sections.map((section) => (
          <div key={section.title} className="rounded-[34px] border border-black/[0.06] bg-white p-8">
            <h2 className="text-[30px] font-semibold tracking-tight">{section.title}</h2>
            <div className="space-y-3 mt-6">
              {section.items.map((item) => (
                <div key={item} className="rounded-2xl bg-[#fafafa] border border-black/[0.06] p-4 text-sm text-zinc-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
