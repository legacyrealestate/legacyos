"use client";

import { Bot, Send, X } from "lucide-react";
import { useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function AlmaDock() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "I’m ALMA. Ask me what needs attention across calls, maintenance, vendors, CRM, or email." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    const value = input.trim();
    if (!value || loading) return;
    const next = [...messages, { role: "user" as const, content: value }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/alma/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value, history: next.slice(1, -1) }),
      });
      const data = await response.json();
      setMessages((current) => [...current, { role: "assistant", content: response.ok ? data.message : data.error || "I couldn’t complete that request." }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "I couldn’t reach the operations service. Check the OpenAI and Supabase connection status." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && <div className="fixed bottom-24 right-4 z-[450] flex h-[min(620px,72vh)] w-[calc(100vw-2rem)] max-w-[420px] flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[#0b0e0c] text-white shadow-2xl md:right-7">
        <div className="flex items-center justify-between border-b border-white/10 p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400 text-black"><Bot size={19} /></span><div><p className="text-sm font-semibold">ALMA</p><p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300">Live operations</p></div></div><button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><X size={17} /></button></div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.map((message, index) => <div key={index} className={`max-w-[88%] rounded-2xl p-3 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-emerald-400 text-black" : "bg-white/8 text-zinc-200"}`}>{message.content}</div>)}{loading && <div className="w-fit rounded-2xl bg-white/8 px-4 py-3 text-xs text-zinc-400">Reading live operations…</div>}</div>
        <div className="border-t border-white/10 p-3"><div className="flex items-end gap-2 rounded-2xl bg-white/8 p-2"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} rows={1} placeholder="Ask ALMA…" className="max-h-28 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-zinc-500" /><button onClick={send} disabled={loading || !input.trim()} className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400 text-black disabled:opacity-40"><Send size={17} /></button></div></div>
      </div>}
      <button onClick={() => setOpen((value) => !value)} className="fixed bottom-5 right-4 z-[440] flex h-14 items-center gap-3 rounded-full bg-[#0b0e0c] px-5 text-sm font-medium text-white shadow-[0_18px_50px_rgba(0,0,0,.25)] md:right-7"><span className="relative"><Bot size={19} /><span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-400" /></span>Ask ALMA</button>
    </>
  );
}
