"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: "solar:widget-5-linear",
  },
  {
    name: "Calls",
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
    name: "AI",
    href: "/ai",
    icon: "solar:magic-stick-3-linear",
  },
];

export default function MobileSidebar() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex w-[95%] max-w-md -translate-x-1/2 items-center justify-between rounded-[28px] border border-zinc-200 bg-white/90 p-2 shadow-2xl backdrop-blur-xl lg:hidden">

      {navigation.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-3 text-xs font-medium transition ${
            pathname === item.href
              ? "bg-zinc-900 text-white"
              : "text-zinc-500 hover:bg-zinc-100"
          }`}
        >

          <Icon icon={item.icon} width="20" />

          {item.name}
        </Link>
      ))}
    </div>
  );
}