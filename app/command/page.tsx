"use client";

import { useState } from "react";

import AppShell from "@/app/components/AppShell";

export default function CommandPage() {

  const [prompt, setPrompt] =
    useState("");

  const [messages, setMessages] =
    useState<any[]>([
      {
        role: "assistant",
        content:
          "Good morning. LegacyOS is monitoring 36 active properties, 3 unresolved maintenance escalations, and 2 high-risk operational alerts. HVAC response times remain stable overall, though vendor capacity is tightening across Antioch and downtown Nashville.",
      },
    ]);

  const [loading, setLoading] =
    useState(false);

  const sendMessage =
    async () => {

      if (!prompt) return;

      const userMessage = {
        role: "user",
        content: prompt,
      };

      setMessages((prev) => [
        ...prev,
        userMessage,
      ]);

      setPrompt("");
      setLoading(true);

      try {

        const res =
          await fetch(
            "/api/command",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                prompt:
                  userMessage.content,
              }),
            }
          );

        const data =
          await res.json();

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              data.reply,
          },
        ]);

      } catch (error) {

        console.error(error);

      }

      setLoading(false);

    };

  return (
    <AppShell>

      {/* HERO */}

      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">

        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">
          Autonomous Operational Intelligence
        </p>

        <h1 className="text-[56px] font-semibold tracking-tight mt-5">
          Chat with LegacyOS
        </h1>

        <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
          Operational command interface for
          maintenance infrastructure, property
          intelligence, vendor coordination,
          escalations, and AI-driven workflow
          orchestration.
        </p>

      </div>

      {/* CHAT */}

      <div className="rounded-[36px] border border-black/[0.06] bg-white p-8 mt-8">

        <div className="space-y-5 max-h-[620px] overflow-y-auto">

          {messages.map(
            (message, index) => (

              <div
                key={index}
                className={`rounded-[30px] p-6 ${
                  message.role ===
                  "user"
                    ? "bg-black text-white ml-auto max-w-[70%]"
                    : "bg-[#f5f5f7] max-w-[78%]"
                }`}
              >

                <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
                  {
                    message.content
                  }
                </p>

              </div>

            )
          )}

          {loading && (

            <div className="rounded-[30px] bg-[#f5f5f7] p-6 max-w-[260px]">

              <p className="text-[14px] text-zinc-500">
                LegacyOS analyzing infrastructure...
              </p>

            </div>

          )}

        </div>

        {/* INPUT */}

        <div className="flex gap-4 mt-8">

          <input
            value={prompt}
            onChange={(e) =>
              setPrompt(
                e.target.value
              )
            }
            placeholder="Ask LegacyOS about operations..."
            className="flex-1 h-[62px] rounded-2xl border border-black/[0.06] px-6 outline-none text-[14px]"
          />

          <button
            onClick={sendMessage}
            className="h-[62px] px-8 rounded-2xl bg-black text-white text-[14px] font-medium"
          >
            Send
          </button>

        </div>

      </div>

    </AppShell>
  );
}