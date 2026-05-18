"use client";

import AppShell from "@/app/components/AppShell";

export default function IntegrationsPage() {

  return (
    <AppShell>

      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">

        <p className="uppercase tracking-[0.25em] text-zinc-400 text-[10px]">
          Infrastructure Integrations
        </p>

        <h1 className="text-[58px] font-semibold tracking-tight mt-5">
          Buildium Sync
        </h1>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">

        <div className="rounded-[34px] border border-black/[0.06] bg-white p-8">

          <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
            API Status
          </p>

          <h2 className="text-[32px] font-semibold mt-5">
            Awaiting Credentials
          </h2>

        </div>

        <div className="rounded-[34px] border border-black/[0.06] bg-white p-8">

          <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
            Sync Status
          </p>

          <h2 className="text-[32px] font-semibold mt-5">
            Ready For Deployment
          </h2>

        </div>

      </div>

    </AppShell>
  );
}