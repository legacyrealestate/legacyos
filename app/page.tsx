"use client";

import AppShell from "@/app/components/AppShell";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Call = { id: string; tenant_name: string; property: string | null; urgency: string; call_status: string | null; ai_summary: string | null; created_at: string };
type Email = { id: string; subject: string | null; urgency: string; status: string; last_message_at: string | null; alma_classification: string | null };
type Dashboard = {
  metrics: { callsToday: number; callsWeek: number; missedFailed: number; openEmergencies: number; callFollowUps: number; emailsAwaitingReply: number; draftsAwaitingApproval: number; overdueFollowUps: number };
  callVolume: Array<{ date: string; label: string; value: number }>;
  urgencyDistribution: Array<{ label: string; value: number }>;
  urgentCalls: Call[]; emailQueue: Email[];
  operations: Array<{ id: string; title: string; description: string; created_at: string }>;
  integrations: Array<{ provider: string; status: string; account_email: string | null; last_success_at: string | null }>;
  sync: { elevenlabs: { last_error?: string | null } | null; lastCallSync: string | null; lastEmailSync: string | null };
  worker: { queued: number; running: number; deadLetter: number; lastActivity: string | null };
};

const formatTime = (value: string | null) => value ? new Date(value).toLocaleString() : "Never";
const metricItems = (data: Dashboard) => [
  ["Calls today", data.metrics.callsToday], ["Calls this week", data.metrics.callsWeek], ["Missed / failed", data.metrics.missedFailed], ["Open emergencies", data.metrics.openEmergencies],
  ["Call follow-ups", data.metrics.callFollowUps], ["Emails awaiting reply", data.metrics.emailsAwaitingReply], ["Drafts awaiting approval", data.metrics.draftsAwaitingApproval], ["Overdue follow-ups", data.metrics.overdueFollowUps],
] as Array<[string, number]>;

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null), [loading, setLoading] = useState(true), [syncing, setSyncing] = useState(false), [error, setError] = useState("");
  const load = useCallback(async () => { setError(""); const response = await fetch("/api/dashboard", { cache: "no-store" }); const json = await response.json(); if (!response.ok) setError(json.error || "Unable to load operations."); else setData(json); setLoading(false); }, []);
  useEffect(() => { let active = true; (async () => { const response = await fetch("/api/dashboard", { cache: "no-store" }); const json = await response.json(); if (!active) return; if (!response.ok) setError(json.error || "Unable to load operations."); else setData(json); setLoading(false); })(); return () => { active = false; }; }, []);
  async function syncCalls() { setSyncing(true); setError(""); const response = await fetch("/api/elevenlabs/sync", { method: "POST" }); const json = await response.json(); if (!response.ok) setError(json.error || "Call synchronization failed."); else await load(); setSyncing(false); }
  const maxVolume = Math.max(1, ...(data?.callVolume.map(item => item.value) || [1]));
  const maxUrgency = Math.max(1, ...(data?.urgencyDistribution.map(item => item.value) || [1]));
  const eleven = data?.integrations.find(item => item.provider === "elevenlabs");
  const emailConnections = data?.integrations.filter(item => item.provider === "google" || item.provider === "microsoft") || [];
  const noCalls = data && data.metrics.callsWeek === 0 && data.urgentCalls.length === 0;

  return <AppShell>
    <section className="rounded-[28px] bg-[#07110c] px-6 py-8 text-white md:px-10 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-7">
        <div><div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-emerald-400"/><p className="text-[11px] uppercase tracking-[.28em] text-emerald-300">Live operations</p></div><h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">Command center.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">Calls, email, approvals, and follow-ups from the production data plane.</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={syncCalls} disabled={syncing} className="h-11 rounded-xl bg-white px-5 text-sm font-medium text-black disabled:opacity-50">{syncing ? "Syncing calls…" : "Sync calls"}</button><Link href="/calls" className="flex h-11 items-center rounded-xl border border-white/15 px-5 text-sm">Phone CRM</Link><Link href="/email" className="flex h-11 items-center rounded-xl border border-white/15 px-5 text-sm">Email</Link><Link href="/command" className="flex h-11 items-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 text-sm text-emerald-200">Ask ALMA</Link></div>
      </div>
    </section>

    {error && <StatePanel tone="error" title="Operations data is unavailable" detail={error} action={<button onClick={load}>Retry</button>}/>} {/* live error state */}
    {loading && <StatePanel title="Loading command center" detail="Reading live call, email, integration, and worker records…"/>}
    {noCalls && <StatePanel title="No calls have been imported" detail={eleven ? "ElevenLabs is configured, but LegacyOS has no local call records yet." : "Configure ElevenLabs, then import the conversation history."} action={<button onClick={syncCalls} disabled={syncing}>Import calls from ElevenLabs</button>}/>} {/* live empty state */}

    {data && <>
      <section aria-label="Operational metrics" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{metricItems(data).map(([label, value]) => <article key={label} className="rounded-2xl border border-black/[.06] bg-white p-5"><p className="text-[10px] uppercase tracking-[.2em] text-zinc-400">{label}</p><p className="mt-4 text-3xl font-semibold tabular-nums">{value}</p></article>)}</section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_.85fr]">
        <article className="rounded-[24px] border border-black/[.06] bg-white p-6"><Header eyebrow="Call intelligence" title="Seven-day volume"/><div className="mt-7 flex h-48 items-end gap-2" aria-label="Real call volume chart">{data.callVolume.map(item => <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center gap-2"><span className="text-xs tabular-nums text-zinc-500">{item.value}</span><div className="w-full rounded-t-lg bg-emerald-500/80" style={{ height: `${Math.max(4, item.value / maxVolume * 145)}px` }}/><span className="text-[10px] text-zinc-400">{item.label}</span></div>)}</div></article>
        <article className="rounded-[24px] border border-black/[.06] bg-white p-6"><Header eyebrow="Classification" title="Urgency distribution"/><div className="mt-6 space-y-4">{data.urgencyDistribution.map(item => <div key={item.label}><div className="mb-2 flex justify-between text-xs"><span>{item.label}</span><span className="tabular-nums text-zinc-400">{item.value}</span></div><div className="h-2 overflow-hidden rounded-full bg-zinc-100"><div className={`h-full rounded-full ${item.label === "Emergency" ? "bg-red-500" : item.label === "Urgent" ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${item.value / maxUrgency * 100}%` }}/></div></div>)}</div></article>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        <Queue title="Recent urgent calls" empty="No urgent calls are open.">{data.urgentCalls.map(call => <Link key={call.id} href={`/calls?selected=${call.id}`} className="block rounded-xl border border-black/[.05] p-4 hover:bg-zinc-50"><div className="flex justify-between gap-3"><p className="font-medium">{call.tenant_name}</p><Badge value={call.urgency}/></div><p className="mt-2 line-clamp-2 text-sm text-zinc-500">{call.ai_summary || call.property || "No summary available"}</p></Link>)}</Queue>
        <Queue title="Email response queue" empty="No email is awaiting a response.">{data.emailQueue.map(thread => <Link key={thread.id} href={`/email?thread=${thread.id}`} className="block rounded-xl border border-black/[.05] p-4 hover:bg-zinc-50"><div className="flex justify-between gap-3"><p className="truncate font-medium">{thread.subject || "(No subject)"}</p><Badge value={thread.urgency}/></div><p className="mt-2 text-xs text-zinc-400">{thread.status} · {thread.alma_classification || "Unclassified"}</p></Link>)}</Queue>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.35fr]">
        <article className="rounded-[24px] border border-black/[.06] bg-white p-6"><Header eyebrow="System health" title="Production services"/><div className="mt-6 space-y-4"><Health label="ElevenLabs" state={eleven?.status || "not connected"} detail={`Last call sync ${formatTime(data.sync.lastCallSync)}`}/>{emailConnections.map(connection => <Health key={connection.provider} label={connection.provider === "google" ? "Gmail" : "Microsoft 365"} state={connection.status} detail={`${connection.account_email || "No company mailbox"} · ${formatTime(connection.last_success_at)}`}/>) }<Health label="ALMA worker" state={data.worker.deadLetter ? "attention required" : data.worker.running ? "running" : "ready"} detail={`${data.worker.queued} queued · ${data.worker.deadLetter} dead letter · ${formatTime(data.worker.lastActivity)}`}/></div></article>
        <Queue title="Recent operational activity" empty="No operational activity has been recorded.">{data.operations.map(item => <div key={item.id} className="rounded-xl border border-black/[.05] p-4"><div className="flex justify-between gap-3"><p className="font-medium">{item.title}</p><time className="text-xs text-zinc-400">{formatTime(item.created_at)}</time></div><p className="mt-2 text-sm text-zinc-500">{item.description}</p></div>)}</Queue>
      </section>
    </>}
  </AppShell>;
}

function Header({ eyebrow, title }: { eyebrow: string; title: string }) { return <div><p className="text-[10px] uppercase tracking-[.22em] text-zinc-400">{eyebrow}</p><h2 className="mt-2 text-xl font-semibold">{title}</h2></div>; }
function Queue({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) { const items = Array.isArray(children) ? children : [children]; return <article className="rounded-[24px] border border-black/[.06] bg-white p-6"><h2 className="text-xl font-semibold">{title}</h2><div className="mt-5 space-y-3">{items.length && items.some(Boolean) ? children : <p className="text-sm text-zinc-500">{empty}</p>}</div></article>; }
function Badge({ value }: { value: string }) { return <span className={`h-fit rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wide ${value === "Emergency" ? "bg-red-50 text-red-700" : value === "Urgent" ? "bg-amber-50 text-amber-700" : "bg-zinc-100 text-zinc-600"}`}>{value}</span>; }
function Health({ label, state, detail }: { label: string; state: string; detail: string }) { const good = ["connected", "healthy", "authenticated", "ready", "running"].includes(state); return <div className="flex items-start justify-between gap-4 border-b border-black/[.05] pb-4 last:border-0"><div><p className="font-medium">{label}</p><p className="mt-1 text-xs text-zinc-400">{detail}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] uppercase ${good ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{state.replaceAll("_", " ")}</span></div>; }
function StatePanel({ title, detail, action, tone }: { title: string; detail: string; action?: React.ReactNode; tone?: "error" }) { return <div className={`mt-6 rounded-2xl border p-5 ${tone === "error" ? "border-red-200 bg-red-50" : "border-black/[.06] bg-white"}`} role="status"><p className="font-medium">{title}</p><p className="mt-1 text-sm text-zinc-500">{detail}</p>{action && <div className="mt-4 [&_button]:rounded-xl [&_button]:bg-black [&_button]:px-4 [&_button]:py-2 [&_button]:text-sm [&_button]:text-white">{action}</div>}</div>; }
