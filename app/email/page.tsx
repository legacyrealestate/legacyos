"use client";

import AppShell from "@/app/components/AppShell";
import { ArrowLeft, Mail, RefreshCw, Send, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

type Thread = { id: string; subject: string; contact_name?: string | null; contact_email: string; status: string; urgency: string; last_message_at: string };
type Message = { id: string; direction: "inbound" | "outbound" | "draft"; from_email: string; to_emails: string[]; subject: string; text_body?: string | null; ai_generated: boolean; created_at: string; sent_at?: string | null };

export default function EmailPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draftText, setDraftText] = useState("");

  async function loadThreads() {
    const response = await fetch("/api/email");
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Unable to load email."); setLoading(false); return; }
    setThreads(Array.isArray(data) ? data : []);
    setSelectedId((current) => current || data[0]?.id || null);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function loadInitialThreads() {
      const response = await fetch("/api/email");
      const data = await response.json();
      if (cancelled) return;
      if (!response.ok) setError(data.error || "Unable to load email.");
      else { setThreads(Array.isArray(data) ? data : []); setSelectedId(data[0]?.id || null); }
      setLoading(false);
    }
    loadInitialThreads();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    async function loadThread() {
      const response = await fetch(`/api/email?threadId=${selectedId}`);
      const data = await response.json();
      if (cancelled) return;
      if (!response.ok) { setError(data.error || "Unable to open email thread."); return; }
      setMessages(data.messages || []);
      const latestDraft = [...(data.messages || [])].reverse().find((message: Message) => message.direction === "draft");
      setDraftText(latestDraft?.text_body || "");
    }
    loadThread();
    return () => { cancelled = true; };
  }, [selectedId]);

  const selected = threads.find((thread) => thread.id === selectedId) || null;
  const latestDraft = [...messages].reverse().find((message) => message.direction === "draft");

  async function generateDraft() {
    if (!selectedId) return;
    setBusy(true); setError("");
    const response = await fetch("/api/email/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadId: selectedId, action: "generate" }) });
    const data = await response.json();
    if (!response.ok) setError(data.error || "Unable to generate a reply.");
    else { setMessages((current) => [...current, data.message]); setDraftText(data.message.text_body || ""); await loadThreads(); }
    setBusy(false);
  }

  async function sendDraft() {
    if (!selectedId || !latestDraft || !draftText.trim()) return;
    setBusy(true); setError("");
    const response = await fetch("/api/email/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadId: selectedId, messageId: latestDraft.id, action: "send", text: draftText }) });
    const data = await response.json();
    if (!response.ok) setError(data.error || "Unable to send the reply.");
    else { await loadThreads(); setMessages((current) => current.map((message) => message.id === latestDraft.id ? { ...message, direction: "outbound", text_body: draftText, sent_at: new Date().toISOString() } : message)); }
    setBusy(false);
  }

  return <AppShell>
    <section className="rounded-[28px] bg-[#0b0e0c] p-6 text-white md:p-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-[10px] uppercase tracking-[0.24em] text-emerald-300">ALMA communications</p><h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Inbox, already triaged.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">Inbound Resend email, urgency detection, reply drafts, review, and delivery history.</p></div><button onClick={loadThreads} className="flex h-11 items-center gap-2 rounded-2xl border border-white/10 px-4 text-xs"><RefreshCw size={15} /> Refresh</button></div></section>
    {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <section className="mt-5 grid min-h-[650px] overflow-hidden rounded-[26px] border border-black/[0.06] bg-white lg:grid-cols-[350px_1fr]">
      <aside className={`${selected ? "hidden lg:block" : "block"} border-r border-black/[0.06]`}><div className="border-b border-black/[0.06] p-5"><p className="text-sm font-semibold">Message queue</p><p className="mt-1 text-xs text-zinc-400">{threads.length} conversations</p></div><div className="max-h-[720px] overflow-y-auto">{loading && <p className="p-5 text-sm text-zinc-500">Loading inbox…</p>}{!loading && threads.length === 0 && <p className="p-5 text-sm leading-6 text-zinc-500">No inbound email yet. Connect the signed Resend webhook shown under Integrations.</p>}{threads.map((thread) => <button key={thread.id} onClick={() => setSelectedId(thread.id)} className={`w-full border-b border-black/[0.05] p-5 text-left ${selectedId === thread.id ? "bg-emerald-50" : "hover:bg-zinc-50"}`}><div className="flex items-start justify-between gap-3"><p className="line-clamp-1 text-sm font-medium">{thread.contact_name || thread.contact_email}</p><span className={`rounded-full px-2 py-1 text-[9px] ${thread.urgency === "Emergency" ? "bg-red-600 text-white" : thread.urgency === "Urgent" ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-600"}`}>{thread.urgency}</span></div><p className="mt-2 line-clamp-1 text-xs text-zinc-600">{thread.subject}</p><div className="mt-3 flex items-center justify-between text-[10px] text-zinc-400"><span>{thread.status}</span><span>{new Date(thread.last_message_at).toLocaleDateString()}</span></div></button>)}</div></aside>
      <main className={`${selected ? "block" : "hidden lg:block"}`}>
        {!selected && <div className="grid h-full place-items-center p-8 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-zinc-100"><Mail className="text-zinc-400" /></span><p className="mt-4 text-sm text-zinc-500">Select a conversation.</p></div></div>}
        {selected && <div className="flex h-full flex-col"><header className="border-b border-black/[0.06] p-5 md:p-6"><button onClick={() => setSelectedId(null)} className="mb-4 flex items-center gap-2 text-xs text-zinc-500 lg:hidden"><ArrowLeft size={15} /> Inbox</button><div className="flex flex-col justify-between gap-3 md:flex-row md:items-start"><div><p className="text-xs text-zinc-400">{selected.contact_name || selected.contact_email} · {selected.contact_email}</p><h2 className="mt-2 text-xl font-semibold">{selected.subject}</h2></div><span className="w-fit rounded-full bg-zinc-100 px-3 py-2 text-[10px]">{selected.status}</span></div></header><div className="flex-1 space-y-4 overflow-y-auto bg-[#f8f8f6] p-5 md:p-6">{messages.filter((message) => message.direction !== "draft").map((message) => <div key={message.id} className={`max-w-[88%] rounded-[22px] p-4 ${message.direction === "outbound" ? "ml-auto bg-[#0b0e0c] text-white" : "border border-black/[0.05] bg-white"}`}><div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.15em] opacity-50"><span>{message.direction}</span><span>{new Date(message.sent_at || message.created_at).toLocaleString()}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{message.text_body || "No plain-text body was provided."}</p></div>)}</div><div className="border-t border-black/[0.06] p-5 md:p-6">{latestDraft ? <><div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-emerald-700"><Sparkles size={14} /> ALMA draft · edit before sending</div><textarea value={draftText} onChange={(event) => setDraftText(event.target.value)} className="min-h-36 w-full rounded-[20px] border border-black/[0.08] p-4 text-sm leading-6" /><div className="mt-3 flex justify-end"><button onClick={sendDraft} disabled={busy || !draftText.trim()} className="flex h-12 items-center gap-2 rounded-2xl bg-black px-5 text-sm text-white disabled:opacity-40"><Send size={16} /> Send approved reply</button></div></> : <button onClick={generateDraft} disabled={busy} className="flex h-12 items-center gap-2 rounded-2xl bg-emerald-500 px-5 text-sm font-medium text-black disabled:opacity-40"><Sparkles size={16} /> {busy ? "ALMA is drafting…" : "Generate reply with ALMA"}</button>}</div></div>}
      </main>
    </section>
  </AppShell>;
}
