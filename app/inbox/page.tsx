"use client";

import AppShell from "@/app/components/AppShell";
import { useState } from "react";

const examples = {
  lead: {
    label: "Lead",
    message: "Hi, I am looking for a 3 bedroom home. What do you have available?",
    reply: "Hi! Thank you for reaching out to Legacy Real Estate Group. I can help you find available and coming soon homes that fit your criteria. The application fee is $55 per adult, or $30 per adult for Waverly. I can also send you the application link and help schedule a showing."
  },
  resident: {
    label: "Resident",
    message: "My sink is leaking and I need maintenance.",
    reply: "I’m sorry you’re dealing with that. I can submit a maintenance request for you. Can you please confirm the property address, when the issue started, whether water is actively leaking, and whether maintenance has permission to enter?"
  },
  owner: {
    label: "Owner",
    message: "Can you send me my owner statement?",
    reply: "Absolutely. I can help send your owner statement. Please confirm the property or owner account name so we can send the correct statement securely."
  },
  balance: {
    label: "Resident Balance",
    message: "How much do I owe and is there a late fee?",
    reply: "I can help check the balance owed. Legacy’s late fee is 10% of rent regardless of the amount owed. I can also send your resident ledger if requested."
  }
};

export default function InboxPage() {
  const [active, setActive] = useState("lead");

  const current = examples[active as keyof typeof examples];

  return (
    <AppShell>
      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">
        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">AI Email Assistant</p>
        <h1 className="text-[44px] md:text-[58px] font-semibold tracking-tight mt-5">AI Inbox</h1>
        <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
          Classify emails into leads, residents, owners, and balance requests. Generate clean replies for Legacy before sending.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6 mt-8">
        <div className="rounded-[34px] border border-black/[0.06] bg-white p-5 space-y-3">
          {Object.entries(examples).map(([key, item]) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`w-full text-left rounded-2xl p-5 border transition ${
                active === key ? "bg-black text-white border-black" : "bg-[#fafafa] border-black/[0.06]"
              }`}
            >
              <p className="text-sm font-semibold">{item.label}</p>
              <p className={`text-xs mt-2 ${active === key ? "text-white/70" : "text-zinc-500"}`}>
                {item.message}
              </p>
            </button>
          ))}
        </div>

        <div className="rounded-[34px] border border-black/[0.06] bg-white p-8">
          <p className="uppercase tracking-[0.24em] text-zinc-400 text-[10px]">Incoming Email</p>
          <div className="rounded-3xl bg-[#fafafa] border border-black/[0.06] p-6 mt-4">
            <p className="text-zinc-800">{current.message}</p>
          </div>

          <p className="uppercase tracking-[0.24em] text-zinc-400 text-[10px] mt-8">Suggested AI Reply</p>
          <div className="rounded-3xl bg-black text-white p-6 mt-4">
            <p className="leading-relaxed">{current.reply}</p>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <button className="h-[48px] px-6 rounded-2xl bg-black text-white text-sm">Approve Reply</button>
            <button className="h-[48px] px-6 rounded-2xl border border-black/[0.08] bg-[#fafafa] text-sm">Edit Reply</button>
            <button className="h-[48px] px-6 rounded-2xl border border-black/[0.08] bg-[#fafafa] text-sm">Create Task</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
