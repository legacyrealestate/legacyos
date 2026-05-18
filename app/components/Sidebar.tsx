"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";

export default function Sidebar() {
  const pathname = usePathname();

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: "solar:widget-5-linear",
    },
    {
      name: "AI Calls",
      href: "/calls",
      icon: "solar:phone-calling-rounded-linear",
    },
    {
      name: "Maintenance",
      href: "/maintenance",
      icon: "solar:wrench-linear",
    },
    {
      name: "Properties",
      href: "/properties",
      icon: "solar:buildings-3-linear",
    },
    {
      name: "Communications",
      href: "/communications",
      icon: "solar:chat-round-line-linear",
    },
    {
      name: "AI Assistant",
      href: "/ai",
      icon: "solar:magic-stick-3-linear",
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: "solar:chart-linear",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: "solar:settings-linear",
    },
  ];

  return (
    <aside className="hidden lg:flex w-72 flex-col border-r border-zinc-200 bg-white/80 backdrop-blur-xl">

      {/* LOGO */}
      <div className="border-b border-zinc-200 p-6">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">

            <Icon icon="solar:buildings-3-linear" width="20" />
          </div>

          <div>

            <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
              LegacyOS
            </h1>

            <p className="text-xs text-zinc-500">
              Cognitive Property System
            </p>
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <div className="flex-1 overflow-y-auto px-4 py-6">

        <div className="mb-3 px-3 font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-400">
          Operations
        </div>

        <div className="space-y-1">

          {navigation.map((item) => (

            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                pathname === item.href
                  ? "border border-zinc-200 bg-zinc-100 font-medium text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >

              <Icon icon={item.icon} width="18" />

              {item.name}
            </Link>
          ))}
        </div>
      </div>

      {/* USER */}
      <div className="border-t border-zinc-200 p-4">

        <div className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-zinc-100">

          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500" />

          <div>

            <p className="text-sm font-medium text-zinc-900">
              Luis Figueroa
            </p>

            <p className="text-xs text-zinc-500">
              Legacy Property Group
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}