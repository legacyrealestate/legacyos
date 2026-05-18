"use client";

import { Icon } from "@iconify/react";

export default function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-8 backdrop-blur-xl">

      <div className="relative w-full max-w-xl">

        <Icon
          icon="solar:minimalistic-magnifer-linear"
          width="18"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400"
        />

        <input
          placeholder="Ask Cognitive Intelligence Engine..."
          className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm outline-none"
        />
      </div>

      <div className="ml-6 flex items-center gap-6">

        <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs">

          <div className="h-2 w-2 rounded-full bg-emerald-400" />

          System Sync
        </div>

        <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white">

          <Icon
            icon="solar:bell-linear"
            width="18"
          />
        </button>
      </div>
    </header>
  );
}