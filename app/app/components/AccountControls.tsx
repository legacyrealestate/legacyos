"use client";

import { LogOut, RefreshCw, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

export type Account = { name: string; email: string; role: string; profileStatus: "active" | "pending" | "inactive"; active: boolean };

export async function endLegacySession() {
  const response = await fetch("/api/auth/logout", { method: "POST", cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error("Unable to sign out. Please retry.");
  window.history.replaceState(null, "", "/login");
  window.location.replace("/login");
}

export default function AccountControls({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const [account, setAccount] = useState<Account | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { let active = true; fetch("/api/auth/session", { cache: "no-store" }).then(async response => { if (!active || !response.ok) return; setAccount(await response.json()); }); return () => { active = false; }; }, []);
  async function signOut() { setBusy(true); setError(""); try { onNavigate?.(); await endLegacySession(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to sign out."); setBusy(false); } }
  if (!account) return null;
  return <div className={`border-t border-black/[.06] ${compact ? "mt-4 p-4" : "mt-5 pt-5"}`}>
    <div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-100"><UserRound size={16}/></div><div className="min-w-0"><p className="truncate text-sm font-medium">{account.name}</p><p className="truncate text-[11px] text-zinc-500">{account.email}</p></div></div>
    <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-wide text-zinc-400"><span>{account.role}</span><span>{account.profileStatus}</span></div>
    <div className="mt-3 grid grid-cols-2 gap-2"><button onClick={signOut} disabled={busy} className="flex items-center justify-center gap-2 rounded-lg border px-2 py-2 text-xs disabled:opacity-50"><LogOut size={13}/>Sign out</button><button onClick={signOut} disabled={busy} className="flex items-center justify-center gap-2 rounded-lg bg-black px-2 py-2 text-xs text-white disabled:opacity-50"><RefreshCw size={13}/>Switch account</button></div>
    {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
  </div>;
}
