"use client";

import AppShell from "@/app/components/AppShell";

export default function CommunicationsPage() {
  return (
    <AppShell>

      <div className="rounded-[36px] border border-black/[0.06] bg-white p-10">

        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">
          Communications Infrastructure
        </p>

        <h1 className="text-[52px] font-semibold tracking-tight mt-5">
          Communications
        </h1>

        <p className="text-zinc-500 text-[16px] mt-5 max-w-2xl leading-relaxed">
          AI-powered tenant messaging, operational notifications,
          automated responses, and communication intelligence.
        </p>

      </div>

      <div className="grid grid-cols-2 gap-6 mt-8">

        <CommCard
          title="AI SMS Routing"
          desc="Automated tenant communication workflows."
        />

        <CommCard
          title="Email Categorization"
          desc="AI inbox organization and escalation."
        />

        <CommCard
          title="Vendor Notifications"
          desc="Real-time dispatch messaging infrastructure."
        />

        <CommCard
          title="Tenant Updates"
          desc="Autonomous reassurance and follow-up systems."
        />

      </div>

    </AppShell>
  );
}

function CommCard({
  title,
  desc,
}: {
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-[30px] border border-black/[0.06] bg-white p-8">

      <h2 className="text-[22px] font-semibold tracking-tight">
        {title}
      </h2>

      <p className="text-zinc-500 text-[14px] leading-relaxed mt-4">
        {desc}
      </p>

    </div>
  );
}