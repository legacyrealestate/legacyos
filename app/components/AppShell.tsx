"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Wrench,
  Building2,
  FileText,
  Users,
  Home,
  Settings,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "AI Inbox", href: "/inbox", icon: Inbox },
    { label: "Leads", href: "/leads", icon: Users },
    { label: "Residents", href: "/residents", icon: Home },
    { label: "Owners", href: "/owners", icon: Building2 },
    { label: "Maintenance", href: "/maintenance", icon: Wrench },
    { label: "Documents", href: "/documents", icon: FileText },
    { label: "Roadmap", href: "/roadmap", icon: FileText },
    { label: "Settings", href: "/settings", icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f3] flex">
      <div className="fixed top-0 left-0 right-0 h-[72px] bg-white border-b border-black/[0.06] z-[200] flex items-center justify-between px-5 md:hidden">
        <h1 className="text-[24px] font-semibold tracking-tight">LegacyOS</h1>
        <button onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className={`fixed inset-y-0 left-0 w-[280px] bg-white border-r border-black/[0.06] z-[300] transform transition-all duration-300 md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 pt-24 space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                className={`h-[56px] px-5 rounded-[18px] flex items-center gap-4 transition ${active ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}>
                <Icon size={18} />
                <span className="text-[14px] font-medium">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="hidden md:flex w-[270px] border-r border-black/[0.06] bg-white flex-col p-6">
        <div>
          <p className="uppercase tracking-[0.3em] text-zinc-400 text-[10px]">
            Legacy Real Estate Group
          </p>
          <h1 className="text-[34px] font-semibold tracking-tight mt-4">
            LegacyOS
          </h1>
          <p className="text-zinc-500 text-sm mt-3">
            AI assistant for leads, residents, owners, documents, and maintenance.
          </p>
        </div>

        <div className="space-y-2 mt-12 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href}
                className={`h-[58px] px-5 rounded-[18px] flex items-center gap-4 transition ${active ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}>
                <Icon size={18} />
                <span className="text-[14px] font-medium">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-[90px] md:pt-8">
        {children}
      </main>
    </div>
  );
}

