"use client";

import AppShell from "@/app/components/AppShell";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Bot, Clock3, Mail, Phone, ShieldCheck, Wrench } from "lucide-react";
import { useEffect, useState } from "react";

type DashboardData = {
  metrics: {
    callsToday: number;
    callsSevenDays: number;
    emergencies: number;
    openTickets: number;
    averageCallSeconds: number;
    activeVendors: number;
    unreadNotifications: number;
    openEmails: number;
    automationSuccess: number;
  };
  callVolume: Array<{ date: string; count: number }>;
  urgentQueue: Array<{ id: string; tenant_name: string; property: string; issue: string; urgency: string; status: string }>;
  operations: Array<{ id: string; title: string; description?: string; created_at: string }>;
  integrations: Array<{ id: string; label: string; configured: boolean }>;
  autonomyMode: string;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/dashboard");
        const json = await response.json();
        if (cancelled) return;
        if (!response.ok) throw new Error(json.error || "Unable to load the command center.");
        setData(json);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load the command center.");
      }
    }
    load();
    const interval = window.setInterval(load, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const maxCalls = Math.max(...(data?.callVolume || []).map((day) => day.count), 1);
  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-[28px] bg-[#0a0d0b] p-6 text-white md:p-9">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-8 xl:flex-row xl:items-end">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_#34d399]" />
              Live operations
              <span className="rounded-full border border-white/10 px-3 py-1 text-zinc-300">{data?.autonomyMode || "loading"}</span>
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] md:text-6xl">Legacy command center.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400 md:text-base">
              Calls, emergencies, maintenance, CRM, and replies in one live operating view—with ALMA watching the queue.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/calls" className="flex h-12 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-medium text-black">Open calls <ArrowRight size={16} /></Link>
            <Link href="/ai" className="flex h-12 items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 text-sm">Ask ALMA <Bot size={16} /></Link>
          </div>
        </div>
        <div className="relative mt-9 flex flex-wrap gap-2">
          {(data?.integrations || []).map((integration) => (
            <div key={integration.id} className={`rounded-full border px-3 py-2 text-[11px] ${integration.configured ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-amber-400/20 bg-amber-400/10 text-amber-200"}`}>
              {integration.configured ? "●" : "○"} {integration.label}
            </div>
          ))}
        </div>
      </section>

      {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}

      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric icon={Phone} label="Calls today" value={data?.metrics.callsToday ?? "—"} detail={`${data?.metrics.callsSevenDays || 0} this week`} />
        <Metric icon={AlertTriangle} label="Emergencies" value={data?.metrics.emergencies ?? "—"} detail="open now" danger={(data?.metrics.emergencies || 0) > 0} />
        <Metric icon={Wrench} label="Open tickets" value={data?.metrics.openTickets ?? "—"} detail={`${data?.metrics.activeVendors || 0} active vendors`} />
        <Metric icon={Mail} label="Email queue" value={data?.metrics.openEmails ?? "—"} detail={`${data?.metrics.automationSuccess || 0} automations / 7d`} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-[26px] border border-black/[0.06] bg-white p-6 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-[10px] uppercase tracking-[0.24em] text-zinc-400">Call intelligence</p><h2 className="mt-3 text-2xl font-semibold tracking-tight">Seven-day volume</h2></div>
            <div className="flex items-center gap-2 text-xs text-zinc-500"><Clock3 size={15} /> Avg {formatDuration(data?.metrics.averageCallSeconds || 0)}</div>
          </div>
          <div className="mt-8 flex h-52 items-end gap-3">
            {(data?.callVolume || Array.from({ length: 7 }, (_, index) => ({ date: String(index), count: 0 }))).map((day) => (
              <div key={day.date} className="flex h-full flex-1 flex-col justify-end gap-3">
                <div className="relative flex-1 rounded-xl bg-zinc-100">
                  <div className="absolute bottom-0 left-0 right-0 min-h-1 rounded-xl bg-gradient-to-t from-emerald-600 to-emerald-300" style={{ height: `${Math.max((day.count / maxCalls) * 100, day.count ? 8 : 2)}%` }} />
                </div>
                <div className="text-center"><p className="text-xs font-medium">{day.count}</p><p className="mt-1 text-[10px] text-zinc-400">{formatDay(day.date)}</p></div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[26px] border border-black/[0.06] bg-white p-6 md:p-8">
          <div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.24em] text-zinc-400">Priority routing</p><h2 className="mt-3 text-2xl font-semibold tracking-tight">Urgent queue</h2></div><ShieldCheck className="text-emerald-600" size={22} /></div>
          <div className="mt-6 space-y-3">
            {(data?.urgentQueue || []).length === 0 && <p className="rounded-2xl bg-zinc-50 p-5 text-sm text-zinc-500">No urgent items are open.</p>}
            {(data?.urgentQueue || []).slice(0, 5).map((ticket) => (
              <Link href="/calls" key={ticket.id} className="block rounded-2xl border border-black/[0.06] p-4 hover:border-black/15">
                <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{ticket.tenant_name}</p><p className="mt-1 text-xs text-zinc-500">{ticket.property}</p></div><span className={`rounded-full px-3 py-1 text-[10px] ${ticket.urgency === "Emergency" ? "bg-red-600 text-white" : "bg-amber-100 text-amber-800"}`}>{ticket.urgency}</span></div>
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-zinc-600">{ticket.issue}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[26px] border border-black/[0.06] bg-white p-6 md:p-8">
        <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-400">Autonomous activity</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {(data?.operations || []).slice(0, 6).map((item) => (
            <div key={item.id} className="rounded-2xl bg-[#f8f8f6] p-4"><p className="text-sm font-medium">{item.title}</p><p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{item.description || "Operational event recorded."}</p></div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Metric({ icon: Icon, label, value, detail, danger = false }: { icon: typeof Phone; label: string; value: number | string; detail: string; danger?: boolean }) {
  return <div className={`rounded-[24px] border p-5 md:p-6 ${danger ? "border-red-200 bg-red-50" : "border-black/[0.06] bg-white"}`}><div className="flex items-center justify-between"><p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</p><Icon size={17} className={danger ? "text-red-600" : "text-emerald-600"} /></div><p className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">{value}</p><p className="mt-2 text-[11px] text-zinc-400">{detail}</p></div>;
}
function formatDuration(seconds: number) { return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`; }
function formatDay(date: string) { const parsed = new Date(`${date}T12:00:00`); return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("en-US", { weekday: "short" }); }
