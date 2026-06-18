"use client";

import AppShell from "@/app/components/AppShell";
import { useState } from "react";

export default function MaintenancePage() {
  const [created, setCreated] = useState(false);

  return (
    <AppShell>
      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">
        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">Resident Task Intake</p>
        <h1 className="text-[44px] md:text-[58px] font-semibold tracking-tight mt-5">Maintenance</h1>
        <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
          Submit resident tasks and ask the right questions before dispatching maintenance.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
        <div className="rounded-[34px] border border-black/[0.06] bg-white p-8 space-y-4">
          <Input label="Resident Name" placeholder="Resident name" />
          <Input label="Property Address" placeholder="Property address" />
          <Input label="Issue Type" placeholder="Plumbing, HVAC, electrical, appliance..." />
          <Textarea label="Issue Details" placeholder="What happened? When did it start? Is it urgent?" />
          <Input label="Permission to Enter" placeholder="Yes / No / Call first" />

          <button onClick={() => setCreated(true)} className="h-[52px] px-7 rounded-2xl bg-black text-white text-sm">
            Create Maintenance Task
          </button>
        </div>

        <div className="rounded-[34px] border border-black/[0.06] bg-white p-8">
          <p className="uppercase tracking-[0.24em] text-zinc-400 text-[10px]">AI Follow-Up Questions</p>
          <div className="space-y-3 mt-5">
            {[
              "When did the issue start?",
              "Is anything actively leaking, smoking, sparking, or flooding?",
              "Can maintenance enter the property?",
              "Are there photos or videos?",
              "Is this affecting safety or access?"
            ].map((q) => (
              <div key={q} className="rounded-2xl bg-[#fafafa] border border-black/[0.06] p-4 text-sm">{q}</div>
            ))}
          </div>

          {created && (
            <div className="rounded-3xl bg-black text-white p-6 mt-6">
              Task created. This is ready to connect to Supabase, vendor dispatch, or email notification.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Input({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">{label}</span>
      <input className="w-full h-[52px] rounded-2xl border border-black/[0.08] bg-[#fafafa] px-4 mt-2 outline-none" placeholder={placeholder} />
    </label>
  );
}

function Textarea({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">{label}</span>
      <textarea className="w-full min-h-[130px] rounded-2xl border border-black/[0.08] bg-[#fafafa] p-4 mt-2 outline-none" placeholder={placeholder} />
    </label>
  );
}
