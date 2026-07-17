"use client";

import { useState } from "react";

export default function EmailReplyModal({
  open,
  onClose,
  email,
}: {
  open: boolean;
  onClose: () => void;
  email: {
    category?: string;
    subject?: string;
    summary?: string;
  };
}) {

  const [loading, setLoading] =
    useState(false);

  const [generated, setGenerated] =
    useState("");

  if (!open) return null;

  const generateReply =
    async () => {

      try {

        setLoading(true);

        const res =
          await fetch(
            "/api/generate-email",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                category:
                  email.category,

                subject:
                  email.subject,

                summary:
                  email.summary,
              }),
            }
          );

        const data =
          await res.json();

        setGenerated(
          data.email || ""
        );

      } catch (error) {

        console.error(error);

      }

      setLoading(false);

    };

  const copyEmail =
    async () => {

      await navigator.clipboard.writeText(
        generated
      );

      alert(
        "Copied to clipboard."
      );

    };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-6">

      {/* BACKDROP */}

      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* MODAL */}

      <div className="relative z-[1000] w-full max-w-4xl rounded-[40px] bg-white border border-black/[0.06] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-start justify-between gap-5">

          <div>

            <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
              AI Email Operations
            </p>

            <h2 className="text-[40px] font-semibold tracking-tight mt-4">
              Generate Reply
            </h2>

          </div>

          <button
            onClick={onClose}
            className="h-[42px] w-[42px] rounded-full border border-black/[0.06]"
          >
            ✕
          </button>

        </div>

        {/* EMAIL */}

        <div className="rounded-[32px] border border-black/[0.06] bg-[#fafafa] p-7 mt-8">

          <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
            Original Email
          </p>

          <h3 className="text-[24px] font-semibold mt-5">
            {email.subject}
          </h3>

          <p className="text-zinc-500 text-[14px] mt-4">
            {email.summary}
          </p>

        </div>

        {/* ACTION */}

        <div className="flex flex-wrap gap-4 mt-8">

          <button
            onClick={generateReply}
            disabled={loading}
            className="h-[54px] px-6 rounded-2xl bg-black text-white text-[14px]"
          >
            {loading
              ? "Generating..."
              : "Generate AI Reply"}
          </button>

        </div>

        {/* GENERATED */}

        {generated && (

          <div className="rounded-[32px] border border-black/[0.06] bg-[#fafafa] p-7 mt-8">

            <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
              Generated Reply
            </p>

            <textarea
              value={generated}
              onChange={(e) =>
                setGenerated(
                  e.target.value
                )
              }
              className="w-full min-h-[260px] bg-transparent outline-none resize-none text-[15px] leading-relaxed mt-6"
            />

            <div className="flex flex-wrap gap-4 mt-6">

              <button
                onClick={copyEmail}
                className="h-[54px] px-6 rounded-2xl bg-black text-white text-[14px]"
              >
                Copy Email
              </button>

            </div>

          </div>

        )}

      </div>

    </div>
  );
}
