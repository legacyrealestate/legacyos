"use client";

import AppShell from "@/app/components/AppShell";

export default function SettingsPage() {
  return (
    <AppShell>

      <div className="rounded-[36px] border border-black/[0.06] bg-white p-10">

        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">
          System Infrastructure
        </p>

        <h1 className="text-[52px] font-semibold tracking-tight mt-5">
          Settings
        </h1>

        <p className="text-zinc-500 text-[16px] mt-5 max-w-2xl leading-relaxed">
          Configure operational preferences, routing behavior,
          notifications, AI systems, and infrastructure controls.
        </p>

      </div>

      <div className="grid grid-cols-2 gap-6 mt-8">

        <div className="rounded-[30px] border border-black/[0.06] bg-white p-8">

          <h2 className="text-[24px] font-semibold tracking-tight">
            Operational Controls
          </h2>

          <div className="space-y-5 mt-8">

            <SettingToggle title="Autonomous Vendor Routing" />
            <SettingToggle title="Emergency Escalation" />
            <SettingToggle title="AI Communications" />

          </div>

        </div>

        <div className="rounded-[30px] border border-black/[0.06] bg-white p-8">

          <h2 className="text-[24px] font-semibold tracking-tight">
            System Status
          </h2>

          <div className="space-y-4 mt-8">

            <Status text="Voice Infrastructure Operational" />
            <Status text="Communications Synced" />
            <Status text="Automation Engine Active" />

          </div>

        </div>

      </div>

    </AppShell>
  );
}

function SettingToggle({
  title,
}: {
  title: string;
}) {
  return (
    <div className="h-[58px] rounded-2xl border border-black/[0.06] px-5 flex items-center justify-between">

      <span className="text-[14px]">
        {title}
      </span>

      <div className="w-12 h-7 rounded-full bg-black relative">

        <div className="absolute right-1 top-1 w-5 h-5 rounded-full bg-white"></div>

      </div>

    </div>
  );
}

function Status({
  text,
}: {
  text: string;
}) {
  return (
    <div className="h-[58px] rounded-2xl border border-black/[0.06] px-5 flex items-center gap-3">

      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>

      <span className="text-[14px]">
        {text}
      </span>

    </div>
  );
}