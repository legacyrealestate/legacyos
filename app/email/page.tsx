"use client";

import { useEffect, useState } from "react";

import AppShell from "@/app/components/AppShell";

import EmailReplyModal from "@/app/components/email/EmailReplyModal";

export default function EmailPage() {

  const [emails, setEmails] =
    useState<any[]>([]);

  const [selectedEmail, setSelectedEmail] =
    useState<any>(null);

  const [open, setOpen] =
    useState(false);

  const loadEmails =
    async () => {

      const res =
        await fetch(
          "/api/email"
        );

      const data =
        await res.json();

      setEmails(data || []);

    };

  useEffect(() => {

    loadEmails();

  }, []);

  return (
    <AppShell>

      <EmailReplyModal
        open={open}
        onClose={() =>
          setOpen(false)
        }
        email={selectedEmail}
      />

      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">

        <p className="uppercase tracking-[0.25em] text-zinc-400 text-[10px]">
          AI Email Infrastructure
        </p>

        <h1 className="text-[58px] font-semibold tracking-tight mt-5">
          Operations Inbox
        </h1>

      </div>

      <div className="space-y-5 mt-8">

        {emails.map(
          (email) => (

            <div
              key={email.id}
              className="rounded-[34px] border border-black/[0.06] bg-white p-8"
            >

              <div className="flex items-center justify-between gap-5">

                <div>

                  <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
                    {email.category}
                  </p>

                  <h2 className="text-[28px] font-semibold mt-3">
                    {email.subject}
                  </h2>

                  <p className="text-zinc-500 text-[14px] mt-3">
                    {email.sender}
                  </p>

                </div>

                <div className="h-[34px] px-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center">
                  {email.priority}
                </div>

              </div>

              <div className="rounded-[28px] border border-black/[0.06] bg-[#fafafa] p-6 mt-6">

                <p className="text-zinc-700 text-[14px] leading-relaxed">
                  {email.summary}
                </p>

              </div>

              <div className="flex flex-wrap gap-4 mt-6">

                <button
                  onClick={() => {

                    setSelectedEmail(
                      email
                    );

                    setOpen(true);

                  }}
                  className="h-[54px] px-6 rounded-2xl bg-black text-white text-[14px]"
                >
                  Generate Reply
                </button>

                <button className="h-[54px] px-6 rounded-2xl border border-black/[0.08] bg-[#fafafa] text-[14px]">
                  Escalate
                </button>

              </div>

            </div>

          )
        )}

      </div>

    </AppShell>
  );
}