"use client";

import AppShell from "@/app/components/AppShell";
import VendorDispatchModal from "@/app/components/VendorDispatchModal";
import { AlertTriangle, Clock3, Headphones, Phone, Search, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Ticket = { id: string; issue: string; status: string; assigned_vendor_name?: string | null; dispatch_status?: string | null; property?: string; unit?: string };
type CallRecord = {
  id: string;
  maintenance_ticket_id?: string | null;
  caller_name?: string | null;
  from_phone?: string | null;
  to_phone?: string | null;
  category: string;
  urgency: string;
  emergency: boolean;
  status: string;
  summary?: string | null;
  transcript?: string | null;
  recording_url?: string | null;
  duration_seconds?: number | null;
  sentiment?: string | null;
  disposition?: string | null;
  started_at?: string | null;
  property_label?: string | null;
  unit?: string | null;
  maintenance_tickets?: Ticket | null;
};

const STATUSES = ["New", "Open", "Needs Review", "Vendor Recommended", "Failed", "In Progress", "Resolved", "Closed"];

export default function CallsPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [selected, setSelected] = useState<CallRecord | null>(null);
  const [dispatchTicket, setDispatchTicket] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [urgency, setUrgency] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("Needs Review");
  const [saving, setSaving] = useState(false);

  async function loadCalls() {
    try {
      const response = await fetch("/api/calls?limit=200");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load calls.");
      setCalls(Array.isArray(data) ? data : []);
      setSelected((current) => current ? (data as CallRecord[]).find((call) => call.id === current.id) || current : current);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load calls.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadInitialCalls() {
      try {
        const response = await fetch("/api/calls?limit=200");
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) throw new Error(data.error || "Unable to load calls.");
        setCalls(Array.isArray(data) ? data : []);
        setError("");
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load calls.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadInitialCalls();
    const interval = window.setInterval(loadInitialCalls, 20000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return calls.filter((call) => {
      if (urgency !== "All" && call.urgency !== urgency) return false;
      if (!needle) return true;
      return [call.caller_name, call.from_phone, call.category, call.summary, call.property_label, call.maintenance_tickets?.issue]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [calls, query, urgency]);

  function openCall(call: CallRecord) {
    setSelected(call);
    setStatus(call.maintenance_tickets?.status || "Needs Review");
    setNote("");
  }

  async function updateTicket(nextStatus: string) {
    const ticketId = selected?.maintenance_ticket_id;
    if (!ticketId) return;
    setSaving(true);
    const response = await fetch(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, note: note || undefined }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error || "Unable to update ticket.");
    else { setNote(""); await loadCalls(); }
    setSaving(false);
  }

  async function emergencyReview() {
    if (!selected?.maintenance_ticket_id) return;
    setSaving(true);
    const response = await fetch("/api/escalation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: selected.maintenance_ticket_id }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error || "Unable to escalate the ticket.");
    else await loadCalls();
    setSaving(false);
  }

  const today = new Date().toISOString().slice(0, 10);
  return (
    <AppShell>
      <section className="rounded-[28px] border border-black/[0.06] bg-white p-6 md:p-8">
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Live phone CRM</div><h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Every call. Fully visible.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-500">Signed ElevenLabs transcripts, urgency, emergencies, maintenance tickets, and vendor decisions—updated automatically.</p></div>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Today" value={calls.filter((call) => (call.started_at || "").slice(0, 10) === today).length} />
            <MiniStat label="Emergency" value={calls.filter((call) => call.emergency).length} danger />
            <MiniStat label="Avg time" value={formatDuration(average(calls.map((call) => call.duration_seconds || 0).filter(Boolean)))} />
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-[24px] border border-black/[0.06] bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="flex h-12 flex-1 items-center gap-3 rounded-2xl bg-zinc-50 px-4"><Search size={17} className="text-zinc-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search caller, number, property, or issue" /></label>
          <select value={urgency} onChange={(event) => setUrgency(event.target.value)} className="h-12 rounded-2xl border border-black/[0.07] bg-white px-4 text-sm"><option>All</option><option>Emergency</option><option>Urgent</option><option>High</option><option>Medium</option><option>Low</option></select>
        </div>
      </section>

      {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <section className="mt-5 overflow-hidden rounded-[26px] border border-black/[0.06] bg-white">
        <div className="hidden grid-cols-[1.3fr_.8fr_.7fr_.7fr_.8fr] gap-4 border-b border-black/[0.06] px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-zinc-400 md:grid"><span>Caller</span><span>Category</span><span>Urgency</span><span>Duration</span><span>Status</span></div>
        {loading && <p className="p-8 text-sm text-zinc-500">Loading call intelligence…</p>}
        {!loading && filtered.length === 0 && <p className="p-8 text-sm text-zinc-500">No calls match this view.</p>}
        {filtered.map((call) => (
          <button key={call.id} onClick={() => openCall(call)} className="grid w-full gap-3 border-b border-black/[0.05] px-5 py-5 text-left last:border-0 hover:bg-zinc-50 md:grid-cols-[1.3fr_.8fr_.7fr_.7fr_.8fr] md:items-center md:gap-4 md:px-6">
            <div><div className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-xl ${call.emergency ? "bg-red-100 text-red-700" : "bg-emerald-50 text-emerald-700"}`}><Phone size={16} /></span><div><p className="text-sm font-medium">{call.caller_name || "Unknown caller"}</p><p className="mt-1 text-xs text-zinc-400">{call.from_phone || "No caller ID"}</p></div></div></div>
            <p className="text-xs text-zinc-600 md:text-sm">{call.category}</p>
            <span className={`w-fit rounded-full px-3 py-1 text-[10px] font-medium ${urgencyClass(call.urgency)}`}>{call.urgency}</span>
            <p className="flex items-center gap-2 text-xs text-zinc-500"><Clock3 size={14} />{formatDuration(call.duration_seconds || 0)}</p>
            <p className="text-xs text-zinc-600">{call.maintenance_tickets?.status || call.status}</p>
          </button>
        ))}
      </section>

      {selected && (
        <div className="fixed inset-0 z-[500] flex justify-end bg-black/35 backdrop-blur-sm" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelected(null); }}>
          <aside className="h-full w-full overflow-y-auto bg-white p-5 shadow-2xl md:w-[620px] md:p-8">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.22em] text-zinc-400">Call intelligence</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">{selected.caller_name || "Unknown caller"}</h2><p className="mt-2 text-sm text-zinc-500">{selected.from_phone || "No caller ID"} · {formatDate(selected.started_at)}</p></div><button onClick={() => setSelected(null)} className="grid h-10 w-10 place-items-center rounded-full bg-zinc-100"><X size={18} /></button></div>
            {selected.emergency && <div className="mt-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertTriangle className="shrink-0" size={20} /><div><p className="font-semibold">Emergency review required</p><p className="mt-1 leading-5">Follow Legacy Nashville’s established emergency procedure immediately. ALMA does not contact emergency services.</p></div></div>}
            <div className="mt-6 grid grid-cols-2 gap-3"><Detail label="Urgency" value={selected.urgency} /><Detail label="Category" value={selected.category} /><Detail label="Property" value={selected.property_label || selected.maintenance_tickets?.property || "Unassigned"} /><Detail label="Disposition" value={selected.disposition || "Not classified"} /></div>
            {selected.recording_url && <div className="mt-5 rounded-2xl bg-zinc-50 p-4"><p className="mb-3 flex items-center gap-2 text-xs font-medium"><Headphones size={15} /> Call recording</p><audio controls className="w-full" src={selected.recording_url} /></div>}
            <Panel icon={Sparkles} title="ALMA summary" text={selected.summary || "No summary was returned by the voice agent."} />
            <Panel icon={Phone} title="Transcript" text={selected.transcript || "No transcript was returned by the voice agent."} tall />
            {selected.maintenance_ticket_id ? <div className="mt-5 rounded-[22px] border border-black/[0.07] p-5"><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Maintenance workflow</p><p className="mt-3 text-sm leading-6 text-zinc-600">{selected.maintenance_tickets?.issue || "Ticket attached to this call."}</p><select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-4 h-12 w-full rounded-2xl border border-black/[0.07] px-4 text-sm">{STATUSES.map((value) => <option key={value}>{value}</option>)}</select><textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-3 min-h-24 w-full rounded-2xl border border-black/[0.07] p-4 text-sm" placeholder="Staff decision or follow-up note" /><div className="mt-3 grid gap-3 sm:grid-cols-2"><button onClick={() => updateTicket(status)} disabled={saving} className="h-12 rounded-2xl bg-black text-sm text-white disabled:opacity-50">Save ticket</button><button onClick={() => setDispatchTicket(selected.maintenance_ticket_id || null)} className="h-12 rounded-2xl border border-black/[0.08] text-sm">Review vendor</button></div><button onClick={emergencyReview} disabled={saving} className="mt-3 h-12 w-full rounded-2xl border border-red-200 bg-red-50 text-sm text-red-700 disabled:opacity-50">Escalate emergency review</button></div> : <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">This provider call does not have a maintenance ticket attached.</div>}
          </aside>
        </div>
      )}
      {dispatchTicket && <VendorDispatchModal ticketId={dispatchTicket} onClose={() => setDispatchTicket(null)} onComplete={loadCalls} />}
    </AppShell>
  );
}

function MiniStat({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }) { return <div className={`min-w-24 rounded-2xl p-4 ${danger ? "bg-red-50" : "bg-zinc-50"}`}><p className="text-[9px] uppercase tracking-[0.18em] text-zinc-400">{label}</p><p className={`mt-2 text-xl font-semibold ${danger ? "text-red-700" : ""}`}>{value}</p></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-zinc-50 p-4"><p className="text-[9px] uppercase tracking-[0.18em] text-zinc-400">{label}</p><p className="mt-2 text-sm font-medium">{value}</p></div>; }
function Panel({ icon: Icon, title, text, tall = false }: { icon: typeof Phone; title: string; text: string; tall?: boolean }) { return <div className="mt-5 rounded-[22px] bg-[#0d100e] p-5 text-white"><p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-emerald-300"><Icon size={15} />{title}</p><p className={`mt-4 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-zinc-300 ${tall ? "max-h-80" : "max-h-40"}`}>{text}</p></div>; }
function urgencyClass(value: string) { if (value === "Emergency") return "bg-red-600 text-white"; if (value === "Urgent" || value === "High") return "bg-amber-100 text-amber-800"; if (value === "Low") return "bg-zinc-100 text-zinc-600"; return "bg-emerald-50 text-emerald-700"; }
function average(values: number[]) { return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0; }
function formatDuration(seconds: number) { return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`; }
function formatDate(value?: string | null) { if (!value) return "Time unavailable"; return new Date(value).toLocaleString(); }
