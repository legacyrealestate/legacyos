"use client";

import AppShell from "@/app/components/AppShell";
import Link from "next/link";
import { useEffect, useState } from "react";

type DashboardData = {
  metrics?: {
    totalCalls: number;
    emergencies: number;
    escalated: number;
    vendors: number;
    notifications: number;
    emailQueue: number;
    workerQueued: number;
    workerDeadLetter: number;
  };
  operations?: Array<{ id?: string; title?: string; description?: string; created_at?: string }>;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (cancelled) return;
      if (!res.ok) setError(json.error || "Unable to load dashboard metrics.");
      else setData(json);
      setLoading(false);
    }
    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = data?.metrics;

  return (
    <AppShell>
      <section className="rounded-[24px] border border-black/[0.06] bg-white p-6 md:p-8">
        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">Supervised Pilot</p>
        <h1 className="text-[38px] md:text-[52px] font-semibold tracking-tight mt-5">LegacyOS</h1>
        <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
          Operational backend for maintenance intake, ticket review, human-approved vendor notifications, documents, and activity tracking.
        </p>

        <div className="flex flex-wrap gap-4 mt-8">
          <Link href="/calls" className="h-[52px] px-6 rounded-2xl bg-black text-white text-[14px] flex items-center">
            Review Tickets
          </Link>
          <Link href="/maintenance" className="h-[52px] px-6 rounded-2xl border border-black/[0.08] bg-[#fafafa] text-[14px] flex items-center">
            Create Intake
          </Link>
        </div>
      </section>

      {loading && <Panel>Loading real dashboard metrics...</Panel>}
      {error && <Panel>{error}</Panel>}

      {metrics && (
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-8">
          <Metric title="Tickets" value={metrics.totalCalls} />
          <Metric title="Emergencies" value={metrics.emergencies} />
          <Metric title="Escalated" value={metrics.escalated} />
          <Metric title="Active Vendors" value={metrics.vendors} />
          <Metric title="Email Queue" value={metrics.emailQueue} />
          <Metric title="ALMA Queue" value={metrics.workerQueued} />
          <Metric title="Dead Letter" value={metrics.workerDeadLetter} />
        </section>
      )}

      <section className="rounded-[24px] border border-black/[0.06] bg-white p-6 md:p-8 mt-8">
        <p className="uppercase tracking-[0.24em] text-zinc-400 text-[10px]">Recent Activity</p>
        <div className="space-y-3 mt-5">
          {(data?.operations || []).length === 0 && !loading && (
            <p className="text-sm text-zinc-500">No activity has been recorded yet.</p>
          )}
          {(data?.operations || []).map((item, index) => (
            <div key={item.id || index} className="rounded-2xl bg-[#fafafa] border border-black/[0.06] p-4">
              <p className="font-medium text-zinc-900">{item.title || "Activity"}</p>
              <p className="text-sm text-zinc-500 mt-1">{item.description || "No description provided."}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[24px] border border-black/[0.06] bg-white p-8 mt-8 text-sm text-zinc-500">{children}</div>;
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-[24px] border border-black/[0.06] bg-white p-6">
      <p className="uppercase tracking-[0.24em] text-zinc-400 text-[10px]">{title}</p>
      <h2 className="text-[36px] font-semibold tracking-tight mt-5">{value}</h2>
    </div>
  );
}
