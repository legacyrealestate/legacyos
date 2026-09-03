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
    <section className="alma-workspace mx-auto grid h-[calc(100vh-7rem)] min-h-[650px] max-w-6xl overflow-hidden rounded-[28px] md:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="alma-rail hidden min-h-0 md:flex md:flex-col">
        <div className="p-4"><button onClick={startNewChat} className="alma-new-chat flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium"><MessageSquarePlus size={17}/>New chat</button></div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">{chats.map((chat) => <div key={chat.id} className={"alma-chat-row group mb-1 flex items-center rounded-xl " + (chat.id === active?.id ? "alma-chat-active" : "")}><button onClick={() => setActiveId(chat.id)} className="min-w-0 flex-1 px-3 py-3 text-left"><p className="truncate text-sm">{chat.title}</p></button><button onClick={() => deleteChat(chat.id)} aria-label="Delete chat" className="mr-1 rounded-lg p-2 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button></div>)}</div>
        <p className="alma-rail-note px-5 py-4 text-[11px] leading-5">ALMA uses the current LegacyOS workspace and private Knowledge files.</p>
      </aside>
      <main className="alma-conversation flex min-w-0 flex-col">
        <header className="alma-header flex items-center justify-between px-6 py-5"><div className="flex items-center gap-3"><span className="alma-mark grid h-10 w-10 place-items-center rounded-xl"><Bot size={18}/></span><div><h1 className="text-[15px] font-semibold tracking-tight">ALMA</h1><p className="mt-0.5 text-xs">Operations intelligence</p></div></div><button onClick={startNewChat} className="alma-mobile-new rounded-xl px-3 py-2 text-xs font-medium md:hidden">New chat</button></header>
        <div className="alma-message-area min-h-0 flex-1 overflow-y-auto"><div className="mx-auto w-full max-w-3xl px-6 py-10 md:px-12">{active?.messages.map((message) => <div key={message.id} className={"alma-message mb-8 " + (message.role === "user" ? "alma-message-user" : "")}><div className="flex gap-3"><span className={"alma-avatar mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold " + (message.role === "assistant" ? "alma-avatar-assistant" : "alma-avatar-user")}>{message.role === "assistant" ? <Bot size={14}/> : "YOU"}</span><div className="min-w-0 flex-1"><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.15em]">{message.role === "assistant" ? "ALMA" : "You"}</p><p className="whitespace-pre-wrap text-[15px] leading-7">{message.content}</p>{message.citations?.length ? <div className="alma-sources mt-4 pl-3"><p className="text-[10px] font-semibold uppercase tracking-[.15em]">Sources used</p>{message.citations.map((citation, index) => <p key={index} className="mt-1 text-xs">{citation.label}</p>)}</div> : null}</div></div></div>)}{loading && <div className="alma-loading flex items-center gap-3 text-sm"><span className="alma-avatar alma-avatar-assistant grid h-8 w-8 place-items-center rounded-full"><Sparkles size={14} className="animate-pulse"/></span>ALMA is reviewing the workspace…</div>}{error && <div className="alma-error rounded-xl p-4 text-sm leading-6">{error}</div>}<div ref={bottom}/></div></div>
        <div className="alma-composer-wrap p-5"><div className="alma-composer mx-auto flex max-w-3xl items-end gap-3 rounded-2xl p-2"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} rows={1} placeholder="Ask ALMA about operations…" className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-6 outline-none"/><button onClick={() => send()} disabled={!input.trim() || loading} className="alma-send grid h-10 w-10 place-items-center rounded-xl disabled:opacity-30"><Send size={16}/></button></div><div className="mx-auto mt-3 flex max-w-3xl gap-2 overflow-x-auto px-1"><button onClick={() => send("What needs staff attention right now?")} className="alma-suggestion shrink-0 rounded-full px-3 py-1.5 text-xs">Attention now</button><button onClick={() => send("Summarize urgent maintenance work.")} className="alma-suggestion shrink-0 rounded-full px-3 py-1.5 text-xs">Urgent maintenance</button><button onClick={() => send("What should we do with the newest emails?")} className="alma-suggestion shrink-0 rounded-full px-3 py-1.5 text-xs">Newest email</button></div></div>
      </main>
    </section>
  </AppShell>;
}
