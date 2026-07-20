"use client";

import AppShell from "@/app/components/AppShell";
import { Bot, CheckCircle2, Mail, Phone, RefreshCw, Settings2, TriangleAlert, Waves } from "lucide-react";
import { useEffect, useState } from "react";

type State = { id: string; label: string; configured: boolean; missing: string[]; detail: string };
type Health = { integrations: State[]; autonomyMode: string; emailAutoreplyMode: string; outboundCommunications: boolean };
const icons: Record<string, typeof Phone> = { supabase: Waves, openai: Bot, twilio: Phone, elevenlabs: Phone, email: Mail };

export default function IntegrationCenter() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");
  async function load() { const response = await fetch("/api/integrations/health"); const data = await response.json(); if (!response.ok) setError(data.error || "Unable to load integration health."); else { setHealth(data); setError(""); } }
  useEffect(() => {
    let cancelled = false;
    async function loadInitialHealth() {
      const response = await fetch("/api/integrations/health");
      const data = await response.json();
      if (cancelled) return;
      if (!response.ok) setError(data.error || "Unable to load integration health.");
      else { setHealth(data); setError(""); }
    }
    loadInitialHealth();
    return () => { cancelled = true; };
  }, []);
  return <AppShell><section className="rounded-[28px] border border-black/[0.06] bg-white p-6 md:p-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-[10px] uppercase tracking-[0.24em] text-emerald-700">Environment control plane</p><h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Know what is actually connected.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-500">LegacyOS validates required variables server-side and shows connection readiness without exposing any secret value.</p></div><button onClick={load} className="flex h-11 items-center gap-2 rounded-2xl border border-black/[0.08] px-4 text-xs"><RefreshCw size={15} /> Recheck</button></div></section>{error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}<section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{(health?.integrations || []).map((integration) => { const Icon = icons[integration.id] || Settings2; return <article key={integration.id} className="rounded-[24px] border border-black/[0.06] bg-white p-6"><div className="flex items-start justify-between"><span className={`grid h-12 w-12 place-items-center rounded-2xl ${integration.configured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}><Icon size={21} /></span>{integration.configured ? <CheckCircle2 className="text-emerald-600" size={20} /> : <TriangleAlert className="text-amber-600" size={20} />}</div><h2 className="mt-5 text-lg font-semibold">{integration.label}</h2><p className="mt-2 text-sm leading-6 text-zinc-500">{integration.detail}</p><div className={`mt-5 rounded-2xl p-4 text-xs ${integration.configured ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{integration.configured ? "Ready" : `Missing: ${integration.missing.join(", ")}`}</div></article>; })}</section><section className="mt-5 rounded-[24px] bg-[#0b0e0c] p-6 text-white md:p-8"><p className="text-[10px] uppercase tracking-[0.22em] text-emerald-300">Automation policy</p><div className="mt-5 grid gap-4 md:grid-cols-3"><Policy label="Operations mode" value={health?.autonomyMode || "—"} /><Policy label="Email replies" value={health?.emailAutoreplyMode || "—"} /><Policy label="Outbound SMS" value={health?.outboundCommunications ? "enabled" : "preview only"} /></div><p className="mt-5 text-xs leading-6 text-zinc-400">Emergency, life-safety, legal, and explicit human-review requests always stop for staff review—even when routine workflows are set to autopilot.</p></section></AppShell>;
}
function Policy({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4"><p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">{label}</p><p className="mt-2 text-sm font-medium capitalize">{value}</p></div>; }
