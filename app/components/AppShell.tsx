"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Bot, Building2, ChevronDown, ContactRound, FileText, Home, LayoutDashboard, Mail, Menu, PhoneCall, PlugZap, Settings, Users, Wrench, X } from "lucide-react";
import { useEffect, useState } from "react";
import NotificationDrawer from "@/app/components/NotificationDrawer";
import AlmaDock from "@/app/components/AlmaDock";
import AccountControls, { endLegacySession, type Account } from "@/app/components/AccountControls";

type NotificationRecord = { id?: string; title?: string; description?: string; type?: string; acknowledged_at?: string | null };
type Item = { label: string; href: string; icon: typeof Mail };

const primary: Item[] = [
  { label: "Inbox", href: "/email", icon: Mail },
  { label: "Call transcripts", href: "/calls", icon: PhoneCall },
  { label: "Knowledge", href: "/knowledge", icon: FileText },
  { label: "ALMA", href: "/ai", icon: Bot },
];

const operations: Item[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Maintenance", href: "/maintenance", icon: Wrench },
  { label: "Contacts", href: "/contacts", icon: ContactRound },
  { label: "Properties", href: "/properties", icon: Building2 },
  { label: "Vendors", href: "/vendors", icon: Users },
  { label: "Activity", href: "/operations", icon: Home },
  { label: "Connections", href: "/integrations", icon: PlugZap },
  { label: "Settings", href: "/settings", icon: Settings },
];

function Navigation({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const isOperationsActive = operations.some((item) => item.href === pathname);
  const item = (link: Item, compact = false) => {
    const Icon = link.icon;
    const active = pathname === link.href;
    return <Link key={link.href} href={link.href} onClick={onNavigate} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-[#e8f5ee] text-[#12643e] shadow-sm" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"}`}>
      <Icon size={compact ? 16 : 18}/><span className="font-medium">{link.label}</span>
    </Link>;
  };
  return <nav aria-label="Workspace navigation" className="space-y-1">
    <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.2em] text-zinc-400">Workspace</p>
    {primary.map((link) => item(link))}
    <details className="group mt-4" open={isOperationsActive}>
      <summary className={`flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2.5 text-sm ${isOperationsActive ? "bg-zinc-100 text-zinc-950" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"}`}>
        <span className="flex items-center gap-3 font-medium"><LayoutDashboard size={18}/>Operations</span><ChevronDown size={16} className="transition group-open:rotate-180"/>
      </summary>
      <div className="ml-5 mt-1 space-y-1 border-l border-zinc-200 py-1 pl-3">{operations.map((link) => item(link, true))}</div>
    </details>
  </nav>;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [notificationError, setNotificationError] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const pathname = usePathname();

  async function loadNotifications() {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    if (!res.ok) { setNotificationError(data.error || "Unable to load notifications."); return; }
    setNotificationError(""); setNotifications(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    let cancelled = false;
    async function loadInitialNotifications() { const res = await fetch("/api/notifications"); const data = await res.json(); if (cancelled) return; if (!res.ok) { setNotificationError(data.error || "Unable to load notifications."); return; } setNotificationError(""); setNotifications(Array.isArray(data) ? data : []); }
    void loadInitialNotifications(); const interval = window.setInterval(loadInitialNotifications, 30000); const onFocus = () => void loadInitialNotifications(); window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.clearInterval(interval); window.removeEventListener("focus", onFocus); };
  }, []);
  useEffect(() => { let active = true; fetch("/api/auth/session", { cache: "no-store" }).then(async response => { if (!active || !response.ok) return; setAccount(await response.json()); }); return () => { active = false; }; }, []);
  const unacknowledgedCount = notifications.filter((notification) => !notification.acknowledged_at).length;

  return <div className="min-h-screen bg-[#f7f8f6] text-zinc-950 md:flex">
    <header className="fixed inset-x-0 top-0 z-[200] flex h-[68px] items-center justify-between border-b border-black/[.07] bg-white/95 px-5 backdrop-blur md:hidden"><span className="text-lg font-semibold tracking-tight">LegacyOS</span><div className="flex items-center gap-4"><button aria-label="Open notifications" onClick={() => setNotificationsOpen(true)} className="relative"><Bell size={19}/>{unacknowledgedCount > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-1.5 text-[10px] text-white">{unacknowledgedCount}</span>}</button><button aria-label="Open navigation" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X/> : <Menu/>}</button></div></header>
    <aside className={`fixed inset-y-0 left-0 z-[300] w-[290px] border-r border-black/[.07] bg-white transition-transform duration-200 md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}><div className="flex h-full flex-col p-5 pt-24"><Navigation pathname={pathname} onNavigate={() => setMobileOpen(false)}/><div className="mt-auto"><AccountControls compact onNavigate={() => setMobileOpen(false)}/></div></div></aside>
    {mobileOpen && <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-[250] bg-black/20 md:hidden"/>}
    <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col border-r border-black/[.07] bg-white p-6 md:flex"><div><p className="text-[10px] font-semibold uppercase tracking-[.25em] text-zinc-400">Legacy Real Estate</p><h1 className="mt-3 text-[30px] font-semibold tracking-tight">LegacyOS</h1><p className="mt-3 max-w-[205px] text-sm leading-5 text-zinc-500">Leasing inbox, call intelligence, and operational memory.</p></div><div className="mt-10 min-h-0 flex-1 overflow-y-auto"><Navigation pathname={pathname}/></div><button onClick={() => setNotificationsOpen(true)} className="mt-5 flex h-11 items-center justify-between rounded-xl border border-black/[.08] px-3 text-sm hover:bg-zinc-50"><span className="flex items-center gap-3"><Bell size={17}/>Notifications</span>{unacknowledgedCount > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] text-white">{unacknowledgedCount}</span>}</button>{notificationError && <p className="mt-2 text-xs text-red-700">{notificationError}</p>}<div className="mt-4"><AccountControls/></div></aside>
    <main className="min-w-0 flex-1 overflow-y-auto p-4 pt-[86px] md:p-8">{account && account.profileStatus !== "active" ? <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-amber-200 bg-white p-8"><p className="text-[10px] uppercase tracking-[.24em] text-amber-700">Account access</p><h1 className="mt-4 text-3xl font-semibold">Profile {account.profileStatus}</h1><p className="mt-4 text-sm leading-6 text-zinc-600">Signed in as <strong>{account.email}</strong>. {account.profileStatus === "pending" ? "This account is awaiting administrator approval." : "This profile is inactive. Contact an administrator."}</p><button onClick={() => endLegacySession()} className="mt-6 rounded-xl bg-black px-5 py-3 text-sm text-white">Sign out and use another account</button></div> : children}</main>
    <NotificationDrawer open={notificationsOpen} onClose={() => { setNotificationsOpen(false); void loadNotifications(); }} notifications={notifications} onAcknowledged={loadNotifications}/><AlmaDock/>
  </div>;
}
