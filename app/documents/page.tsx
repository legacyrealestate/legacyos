"use client";

import AppShell from "@/app/components/AppShell";

const templates = [
  {
    title: "Application Cost",
    text: "The application fee is $55 per adult. For Waverly, the application fee is $30 per adult."
  },
  {
    title: "Late Fee",
    text: "Legacy’s late fee is 10% of rent regardless of the amount owed."
  },
  {
    title: "Move-Out Notice",
    text: "Move-out notice requirements may be 30, 45, or 60 days depending on the resident’s lease."
  },
  {
    title: "Maintenance Intake",
    text: "Please provide your property address, details of the issue, when it started, photos if available, and whether maintenance has permission to enter."
  },
  {
    title: "Owner Statement",
    text: "Please confirm the property or owner account name so we can send the correct owner statement securely."
  },
  {
    title: "Portal Password Reset",
    text: "We can send a resident portal password reset email upon request."
  }
];

export default function DocumentsPage() {
  return (
    <AppShell>
      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">
        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">Templates & Documents</p>
        <h1 className="text-[44px] md:text-[58px] font-semibold tracking-tight mt-5">Documents</h1>
        <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
          Launch-ready templates for application costs, late fees, move-out notices, maintenance intake, owner statements, and portal resets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
        {templates.map((doc) => (
          <div key={doc.title} className="rounded-[30px] border border-black/[0.06] bg-white p-7">
            <p className="text-zinc-900 text-[18px] font-semibold">{doc.title}</p>
            <p className="text-zinc-500 text-[14px] leading-relaxed mt-3">{doc.text}</p>
            <button
              onClick={() => navigator.clipboard.writeText(doc.text)}
              className="h-[42px] px-5 rounded-xl bg-black text-white text-xs mt-5"
            >
              Copy Template
            </button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
