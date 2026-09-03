"use client";

import { Icon } from "@iconify/react";

export default function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-8 backdrop-blur-xl">
      <div className="relative w-full max-w-xl">
        <Icon
          icon="solar:minimalistic-magnifer-linear"
          width="18"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          aria-label="Search"
          placeholder="Search pilot workspace"
          className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm outline-none"
        />
      </div>

      <div className="ml-6 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-500">
        Supervised Pilot
      </div>
    </header>
  );
}
