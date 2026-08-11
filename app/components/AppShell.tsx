"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wrench,
  FileText,
  Users,
  Home,
  Settings,
  Menu,
  X,
  Bell,
  PhoneCall,
  Bot,
  Mail,
  ContactRound,
  Building2,
  PlugZap,
} from "lucide-react";
import { useEffect, useState } from "react";
import NotificationDrawer from "@/app/components/NotificationDrawer";
import AlmaDock from "@/app/components/AlmaDock";
import AccountControls, { endLegacySession, type Account } from "@/app/components/AccountControls";

type NotificationRecord = {
  id?: string;
  title?: string;
  description?: string;
  type?: string;
  acknowledged_at?: string | null;
};

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
    if (!res.ok) {
      setNotificationError(data.error || "Unable to load notifications.");
      return;
    }
    setNotificationError("");
    setNotifications(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialNotifications() {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setNotificationError(data.error || "Unable to load notifications.");
        return;
      }
      setNotificationError("");
      setNotifications(Array.isArray(data) ? data : []);
    }

    loadInitialNotifications();
    const interval = window.setInterval(loadInitialNotifications, 30000);
    const onFocus = () => loadInitialNotifications();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => { let active = true; fetch("/api/auth/session", { cache: "no-store" }).then(async response => { if (!active || !response.ok) return; setAccount(await response.json()); }); return () => { active = false; }; }, []);

  const unacknowledgedCount = notifications.filter((notification) => !notification.acknowledged_at).length;

  const links = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Phone CRM", href: "/calls", icon: PhoneCall },
    { label: "Email", href: "/email", icon: Mail },
    { label: "ALMA", href: "/ai", icon: Bot },
    { label: "Maintenance", href: "/maintenance", icon: Wrench },
    { label: "Contacts", href: "/contacts", icon: ContactRound },
    { label: "Properties", href: "/properties", icon: Building2 },
    { label: "Vendors", href: "/vendors", icon: Users },
    { label: "Knowledge", href: "/knowledge", icon: FileText },
    { label: "Operations", href: "/operations", icon: Home },
    { label: "Integrations", href: "/integrations", icon: PlugZap },
    { label: "Roadmap", href: "/roadmap", icon: FileText },
    { label: "Settings", href: "/settings", icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f3] flex">
      <div className="fixed top-0 left-0 right-0 h-[72px] bg-white border-b border-black/[0.06] z-[200] flex items-center justify-between px-5 md:hidden">
        <h1 className="text-[24px] font-semibold tracking-tight">LegacyOS</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setNotificationsOpen(true)} className="relative">
            <Bell size={20} />
            {unacknowledgedCount > 0 && (
              <span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-1.5 text-[10px] text-white">
                {unacknowledgedCount}
              </span>
            )}
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <div className={`fixed inset-y-0 left-0 w-[280px] bg-white border-r border-black/[0.06] z-[300] transform transition-all duration-300 md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col p-6 pt-24">
          <div className="space-y-2 overflow-y-auto">
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
          <div className="mt-auto"><AccountControls compact onNavigate={() => setMobileOpen(false)}/></div>
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
            Autonomous calls, CRM, maintenance, email, vendors, and operations.
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
        <button
          onClick={() => setNotificationsOpen(true)}
          className="mt-6 h-[48px] px-5 rounded-[18px] border border-black/[0.08] flex items-center justify-between text-[14px]"
        >
          <span className="flex items-center gap-3"><Bell size={18} /> Notifications</span>
          {unacknowledgedCount > 0 && <span className="rounded-full bg-red-600 px-2 py-1 text-[10px] text-white">{unacknowledgedCount}</span>}
        </button>
        {notificationError && <p className="mt-3 text-xs text-red-700">{notificationError}</p>}
        <div className="mt-auto"><AccountControls /></div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-[90px] md:pt-8">
        {account && account.profileStatus !== "active" ? <div className="mx-auto mt-16 max-w-xl rounded-[28px] border border-amber-200 bg-white p-8"><p className="text-[10px] uppercase tracking-[.24em] text-amber-700">Account access</p><h1 className="mt-4 text-3xl font-semibold">Profile {account.profileStatus}</h1><p className="mt-4 text-sm leading-6 text-zinc-600">Signed in as <strong>{account.email}</strong>. {account.profileStatus === "pending" ? "This account is awaiting administrator approval." : "This profile is inactive. Contact an administrator."}</p><button onClick={() => endLegacySession()} className="mt-6 rounded-xl bg-black px-5 py-3 text-sm text-white">Sign out and use another account</button></div> : children}
      </main>
      <NotificationDrawer
        open={notificationsOpen}
        onClose={() => {
          setNotificationsOpen(false);
          loadNotifications();
        }}
        notifications={notifications}
        onAcknowledged={loadNotifications}
      />
      <AlmaDock />
    </div>
  );
}
