"use client";

import AppShell from "@/app/components/AppShell";
import { Bot, Send, Sparkles } from "lucide-react";
import { useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
const prompts = ["What needs my attention right now?", "Summarize emergency and urgent calls.", "Which maintenance tickets are waiting on a vendor?", "Show me the email queue and suggested next steps."];

export default function AiPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "I’m ALMA, connected to your live LegacyOS workspace. I can analyze calls, maintenance, CRM, vendors, and the email queue without pretending an action happened." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(value = input) {
    const text = value.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/alma/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, history: next.slice(1, -1) }) });
      const data = await response.json();
      setMessages((current) => [...current, { role: "assistant", content: response.ok ? data.message : data.error || "ALMA could not answer." }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "The operations service is unreachable. Check your OpenAI and Supabase configuration." }]);
    } finally { setLoading(false); }
  }

  return <AppShell>
    <section className="mx-auto max-w-5xl overflow-hidden rounded-[30px] bg-[#0b0e0c] text-white shadow-xl">
      <div className="border-b border-white/10 p-6 md:p-8"><div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-[20px] bg-emerald-400 text-black shadow-[0_0_40px_rgba(52,211,153,.25)]"><Bot size={25} /></span><div><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Connected to live operations</div><h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">ALMA</h1></div></div><p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-400">Your private operations copilot for Legacy Nashville. Ask in plain English and get answers grounded in the current workspace.</p></div>
      <div className="min-h-[460px] space-y-5 p-5 md:p-8">{messages.map((message, index) => <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-[22px] p-4 text-sm leading-7 md:max-w-[76%] ${message.role === "user" ? "bg-emerald-400 text-black" : "border border-white/10 bg-white/[0.06] text-zinc-200"}`}>{message.content}</div></div>)}{loading && <div className="flex items-center gap-3 text-sm text-zinc-400"><Sparkles className="animate-pulse text-emerald-300" size={17} /> ALMA is reading the live workspace…</div>}</div>
      {messages.length === 1 && <div className="flex flex-wrap gap-2 px-5 pb-5 md:px-8">{prompts.map((prompt) => <button key={prompt} onClick={() => send(prompt)} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-zinc-300 hover:bg-white/10">{prompt}</button>)}</div>}
      <div className="border-t border-white/10 p-4 md:p-6"><div className="flex items-end gap-3 rounded-[22px] bg-white/[0.07] p-3"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} rows={2} placeholder="Ask about calls, emergencies, maintenance, vendors, contacts, or email…" className="max-h-36 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-zinc-500" /><button onClick={() => send()} disabled={!input.trim() || loading} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-400 text-black disabled:opacity-40"><Send size={19} /></button></div></div>
    </section>
  </AppShell>;
}
