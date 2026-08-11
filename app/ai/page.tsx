"use client";

import AppShell from "@/app/components/AppShell";
import { Bot, MessageSquarePlus, Send, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Citation = { type: string; label: string; excerpt: string };
type Message = { id: string; role: "user" | "assistant"; content: string; citations?: Citation[] };
type Chat = { id: string; title: string; updatedAt: number; messages: Message[] };
const storageKey = "legacyos-alma-chats-v2";
const welcome = "I can help you review operations, investigate a call or email, find a vendor, or answer from Knowledge. I will show the records I used.";
const createChat = (): Chat => ({ id: crypto.randomUUID(), title: "New conversation", updatedAt: Date.now(), messages: [{ id: crypto.randomUUID(), role: "assistant", content: welcome }] });

function readResponse(response: Response, raw: string) {
  try { return JSON.parse(raw) as { error?: string; message?: string; citations?: Citation[] }; }
  catch {
    if (response.status === 401 || response.status === 403) throw new Error("Your LegacyOS session has expired. Sign in again, then resend your message.");
    throw new Error("ALMA is temporarily unavailable. Check the Vercel deployment and its Supabase/OpenAI variables.");
  }
}

export default function AiPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(storageKey);
        const saved = stored ? JSON.parse(stored) as Chat[] : [];
        const initial = saved.length ? saved : [createChat()];
        setChats(initial);
        setActiveId(initial[0].id);
      } catch {
        const initial = [createChat()];
        setChats(initial);
        setActiveId(initial[0].id);
      }
    });
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => { if (chats.length) localStorage.setItem(storageKey, JSON.stringify(chats)); }, [chats]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [activeId, chats, loading]);
  const active = useMemo(() => chats.find((chat) => chat.id === activeId) || chats[0], [activeId, chats]);
  const update = (id: string, change: (chat: Chat) => Chat) => setChats((current) => current.map((chat) => chat.id === id ? change(chat) : chat).sort((a, b) => b.updatedAt - a.updatedAt));

  function startNewChat() {
    const chat = createChat();
    setChats((current) => [chat, ...current]);
    setActiveId(chat.id);
    setInput("");
    setError("");
  }

  function deleteChat(id: string) {
    setChats((current) => {
      const next = current.filter((chat) => chat.id !== id);
      const safe = next.length ? next : [createChat()];
      setActiveId(safe[0].id);
      return safe;
    });
  }

  async function send(value = input) {
    const text = value.trim();
    if (!text || !active || loading) return;
    const user: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const history = [...active.messages, user];
    setInput("");
    setError("");
    update(active.id, (chat) => ({ ...chat, title: chat.title === "New conversation" ? text.slice(0, 46) : chat.title, updatedAt: Date.now(), messages: history }));
    setLoading(true);
    try {
      const response = await fetch("/api/alma/chat", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ message: text, history: history.slice(-12, -1).map(({ role, content }) => ({ role, content })) }) });
      const data = readResponse(response, await response.text());
      if (!response.ok) throw new Error(data.error || "ALMA could not answer.");
      update(active.id, (chat) => ({ ...chat, updatedAt: Date.now(), messages: [...chat.messages, { id: crypto.randomUUID(), role: "assistant", content: data.message || "I could not produce a response.", citations: data.citations || [] }] }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ALMA could not answer.");
    } finally {
      setLoading(false);
    }
  }

  return <AppShell>
    <section className="mx-auto grid h-[calc(100vh-7rem)] min-h-[650px] max-w-6xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm md:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden min-h-0 border-r border-zinc-200 bg-zinc-50 md:flex md:flex-col">
        <div className="p-3"><button onClick={startNewChat} className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-100"><MessageSquarePlus size={16}/>New chat</button></div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">{chats.map((chat) => <div key={chat.id} className={"group mb-1 flex items-center rounded-md " + (chat.id === active?.id ? "bg-zinc-200/80" : "hover:bg-zinc-100")}><button onClick={() => setActiveId(chat.id)} className="min-w-0 flex-1 px-3 py-2.5 text-left"><p className="truncate text-sm text-zinc-800">{chat.title}</p></button><button onClick={() => deleteChat(chat.id)} aria-label="Delete chat" className="mr-1 rounded p-1.5 text-zinc-400 opacity-0 hover:bg-white hover:text-red-600 group-hover:opacity-100"><Trash2 size={14}/></button></div>)}</div>
        <p className="border-t border-zinc-200 px-4 py-3 text-[11px] leading-4 text-zinc-500">ALMA uses the current LegacyOS workspace and private Knowledge files.</p>
      </aside>
      <main className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500 text-white"><Bot size={18}/></span><div><h1 className="text-sm font-semibold text-zinc-900">ALMA</h1><p className="text-xs text-zinc-500">LegacyOS operations assistant</p></div></div><button onClick={startNewChat} className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium md:hidden">New chat</button></header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#fcfcfb]"><div className="mx-auto w-full max-w-3xl px-5 py-8 md:px-10">{active?.messages.map((message) => <div key={message.id} className="mb-7"><div className="flex gap-3"><span className={"mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold " + (message.role === "assistant" ? "bg-emerald-500 text-white" : "bg-zinc-900 text-white")}>{message.role === "assistant" ? <Bot size={14}/> : "You"}</span><div className="min-w-0 flex-1"><p className="mb-2 text-xs font-semibold text-zinc-800">{message.role === "assistant" ? "ALMA" : "You"}</p><p className="whitespace-pre-wrap text-sm leading-7 text-zinc-700">{message.content}</p>{message.citations?.length ? <div className="mt-4 border-l-2 border-emerald-400 pl-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Sources used</p>{message.citations.map((citation, index) => <p key={index} className="mt-1 text-xs text-zinc-600">{citation.label}</p>)}</div> : null}</div></div></div>)}{loading && <div className="flex items-center gap-3 text-sm text-zinc-500"><span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white"><Sparkles size={14} className="animate-pulse"/></span>ALMA is reviewing the workspace...</div>}{error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">{error}</div>}<div ref={bottom}/></div></div>
        <div className="border-t border-zinc-200 bg-white p-4"><div className="mx-auto flex max-w-3xl items-end gap-3 rounded-xl border border-zinc-300 bg-white p-2 shadow-sm focus-within:border-zinc-500"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} rows={1} placeholder="Ask ALMA about operations..." className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-zinc-800 outline-none placeholder:text-zinc-400"/><button onClick={() => send()} disabled={!input.trim() || loading} className="grid h-9 w-9 place-items-center rounded-lg bg-zinc-900 text-white hover:bg-black disabled:opacity-30"><Send size={16}/></button></div><div className="mx-auto mt-2 flex max-w-3xl gap-2 overflow-x-auto px-1"><button onClick={() => send("What needs staff attention right now?")} className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-200">Attention now</button><button onClick={() => send("Summarize urgent maintenance work.")} className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-200">Urgent maintenance</button><button onClick={() => send("What should we do with the newest emails?")} className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-200">Newest email</button></div></div>
      </main>
    </section>
  </AppShell>;
}
