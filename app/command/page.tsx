"use client";

import { useState } from "react";
import AppShell from "@/app/components/AppShell";

export default function CommandPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const askCommand = async () => {
    if (!question.trim()) return;

    const currentQuestion = question;
    setQuestion("");

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: currentQuestion,
      },
    ]);

    setLoading(true);

    try {
      const res = await fetch("/api/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: currentQuestion,
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || "No response generated.",
        },
      ]);
    } catch (error) {
      console.error(error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Command Center could not process that request.",
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <AppShell>
      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">
        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">
          LegacyOS Command Center
        </p>

        <h1 className="text-[38px] md:text-[56px] font-semibold tracking-tight mt-5">
          Command
        </h1>

        <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
          Ask LegacyOS what is happening across calls, vendors, maintenance,
          tickets, dispatching, and operational memory.
        </p>
      </div>

      <div className="rounded-[36px] border border-black/[0.06] bg-white p-6 mt-8 min-h-[500px] flex flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto">
          {messages.length === 0 && (
            <div className="rounded-[28px] bg-[#fafafa] border border-black/[0.06] p-8">
              <h2 className="text-[26px] font-semibold">
                Ask LegacyOS anything.
              </h2>

              <p className="text-zinc-500 text-[14px] mt-4">
                Example: “Who was dispatched for the water leak?” or “What
                emergency tickets are open right now?”
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={
                message.role === "user"
                  ? "rounded-[24px] bg-black text-white p-5 ml-auto max-w-2xl"
                  : "rounded-[24px] bg-[#fafafa] border border-black/[0.06] p-5 max-w-3xl"
              }
            >
              <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
          ))}

          {loading && (
            <div className="rounded-[24px] bg-[#fafafa] border border-black/[0.06] p-5 max-w-3xl">
              <p className="text-zinc-500 text-[14px]">
                LegacyOS is analyzing operations...
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") askCommand();
            }}
            placeholder="Ask about tickets, vendors, dispatches, emergencies..."
            className="flex-1 h-[56px] rounded-2xl border border-black/[0.08] bg-[#fafafa] px-5 text-[14px] outline-none"
          />

          <button
            onClick={askCommand}
            disabled={loading}
            className="h-[56px] px-7 rounded-2xl bg-black text-white text-[14px] disabled:opacity-50"
          >
            Ask
          </button>
        </div>
      </div>
    </AppShell>
  );
}
