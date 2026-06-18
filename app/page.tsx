"use client";

import AppShell from "@/app/components/AppShell";
import Link from "next/link";

const workflows = [
  {
    title: "Leads",
    description: "Recommend homes, explain application cost, send application link, schedule showings.",
    href: "/leads",
    items: ["Available homes", "Coming soon listings", "$55 application / $30 Waverly", "Showing scheduling"]
  },
  {
    title: "Residents",
    description: "Answer resident requests, create tasks, send ledgers, leases, move-out info, and password reset help.",
    href: "/residents",
    items: ["Maintenance intake", "Balance owed", "Resident ledger", "Lease / move-out procedure"]
  },
  {
    title: "Owners",
    description: "Send owner statements and keep owner requests organized.",
    href: "/owners",
    items: ["Owner statement", "Owner request tracking"]
  },
  {
    title: "Documents",
    description: "Central place for leases, HOA docs, move-out notices, procedures, and templates.",
    href: "/documents",
    items: ["Leases", "HOA docs", "Move-out notices", "Qualification standards"]
  }
];

export default function DashboardPage() {
  return (
    <AppShell>
      <section className="rounded-[40px] border border-black/[0.06] bg-white p-8 md:p-10">
        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">
          Client Handoff Version
        </p>

        <h1 className="text-[38px] md:text-[58px] font-semibold tracking-tight mt-5">
          LegacyOS
        </h1>

        <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
          Built for Legacy Real Estate Group to manage lead questions, resident requests,
          owner statements, maintenance intake, documents, and AI-powered email responses.
        </p>

        <div className="flex flex-wrap gap-4 mt-8">
          <Link href="/inbox" className="h-[52px] px-6 rounded-2xl bg-black text-white text-[14px] flex items-center">
            Open AI Inbox
          </Link>
          <Link href="/maintenance" className="h-[52px] px-6 rounded-2xl border border-black/[0.08] bg-[#fafafa] text-[14px] flex items-center">
            View Maintenance
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mt-8">
        <Metric title="Lead Workflows" value="4" />
        <Metric title="Resident Workflows" value="8" />
        <Metric title="Owner Workflows" value="1" />
        <Metric title="Launch Focus" value="Today" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
        {workflows.map((workflow) => (
          <Link key={workflow.title} href={workflow.href} className="rounded-[34px] border border-black/[0.06] bg-white p-8 hover:-translate-y-1 transition">
            <p className="uppercase tracking-[0.24em] text-zinc-400 text-[10px]">
              Workflow
            </p>
            <h2 className="text-[30px] font-semibold tracking-tight mt-4">
              {workflow.title}
            </h2>
            <p className="text-zinc-500 text-[14px] leading-relaxed mt-3">
              {workflow.description}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
              {workflow.items.map((item) => (
                <div key={item} className="rounded-2xl bg-[#fafafa] border border-black/[0.06] p-4 text-sm text-zinc-700">
                  {item}
                </div>
              ))}
            </div>
          </Link>
        ))}
      </section>
    </AppShell>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[30px] border border-black/[0.06] bg-white p-7">
      <p className="uppercase tracking-[0.24em] text-zinc-400 text-[10px]">{title}</p>
      <h2 className="text-[36px] font-semibold tracking-tight mt-5">{value}</h2>
    </div>
  );
}
