"use client";

import { useEffect, useState } from "react";
import AppShell from "@/app/components/AppShell";

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadVendors = async () => {
    try {
      const res = await fetch("/api/vendors");
      const data = await res.json();
      setVendors(data || []);
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const filtered = vendors.filter((vendor) => {
    const text = `
      ${vendor.name}
      ${vendor.trade}
      ${vendor.category}
      ${vendor.login_email}
      ${vendor.alternate_email}
      ${vendor.work_phone}
      ${vendor.mobile_phone}
      ${vendor.city}
      ${vendor.priority}
    `.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  const trades = Array.from(
    new Set(filtered.map((vendor) => vendor.trade || "Uncategorized"))
  );

  if (loading) {
    return (
      <AppShell>
        <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">
          <p className="text-zinc-500">Loading vendors...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">
        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">
          Vendor Intelligence
        </p>

        <h1 className="text-[38px] md:text-[56px] font-semibold tracking-tight mt-5">
          Vendors
        </h1>

        <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
          Track vendor assignments, open jobs, dispatch volume, emergency support,
          and contractor performance across LegacyOS.
        </p>

        <div className="mt-8">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor, trade, phone, email, city..."
            className="w-full h-[56px] rounded-2xl border border-black/[0.08] bg-[#fafafa] px-5 text-[14px] outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
        <MetricCard title="Total Vendors" value={vendors.length} />
        <MetricCard title="Trades" value={trades.length} />
        <MetricCard
          title="Open Jobs"
          value={vendors.reduce((sum, v) => sum + (v.open_jobs || 0), 0)}
        />
        <MetricCard
          title="Total Dispatches"
          value={vendors.reduce((sum, v) => sum + (v.total_dispatched || 0), 0)}
        />
      </div>

      <div className="rounded-[36px] border border-black/[0.06] bg-white p-8 mt-8">
        <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
          Vendor Workload Leaderboard
        </p>

        <div className="space-y-4 mt-6">
          {[...vendors]
            .sort((a, b) => (b.total_dispatched || 0) - (a.total_dispatched || 0))
            .slice(0, 8)
            .map((vendor) => (
              <div
                key={vendor.id}
                className="rounded-[22px] border border-black/[0.06] bg-[#fafafa] p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div>
                  <h3 className="text-[18px] font-semibold">{vendor.name}</h3>
                  <p className="text-zinc-500 text-[13px] mt-1">
                    {vendor.trade || "Uncategorized"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-[12px]">
                  <Badge label={`Open: ${vendor.open_jobs || 0}`} />
                  <Badge label={`Completed: ${vendor.completed_jobs || 0}`} />
                  <Badge label={`Dispatched: ${vendor.total_dispatched || 0}`} />
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="space-y-8 mt-8">
        {trades.map((trade) => {
          const tradeVendors = filtered.filter(
            (vendor) => (vendor.trade || "Uncategorized") === trade
          );

          return (
            <div
              key={trade}
              className="rounded-[36px] border border-black/[0.06] bg-white p-8"
            >
              <div className="flex items-center justify-between gap-5">
                <div>
                  <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
                    Trade Category
                  </p>

                  <h2 className="text-[28px] font-semibold tracking-tight mt-3">
                    {trade}
                  </h2>
                </div>

                <div className="h-[36px] px-4 rounded-full bg-black text-white text-[11px] flex items-center">
                  {tradeVendors.length} Vendors
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-7">
                {tradeVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="rounded-[28px] border border-black/[0.06] bg-[#fafafa] p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-[22px] font-semibold tracking-tight">
                          {vendor.name}
                        </h3>

                        <p className="text-zinc-500 text-[13px] mt-3">
                          {vendor.category || "Uncategorized"}
                        </p>
                      </div>

                      <div className="h-[30px] px-3 rounded-full bg-white border border-black/[0.06] text-[10px] flex items-center">
                        {vendor.priority || "Standard"}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-5">
                      <MiniStat title="Open" value={vendor.open_jobs || 0} />
                      <MiniStat title="Done" value={vendor.completed_jobs || 0} />
                      <MiniStat title="Total" value={vendor.total_dispatched || 0} />
                    </div>

                    <div className="mt-5 space-y-2 text-[13px] text-zinc-600">
                      <p><span className="text-zinc-400">Mobile:</span> {vendor.mobile_phone || "Not added"}</p>
                      <p><span className="text-zinc-400">Work:</span> {vendor.work_phone || "Not added"}</p>
                      <p><span className="text-zinc-400">Email:</span> {vendor.login_email || vendor.alternate_email || "Not added"}</p>
                      <p><span className="text-zinc-400">City:</span> {vendor.city || "Not added"}</p>
                      <p><span className="text-zinc-400">Last Dispatch:</span> {vendor.last_dispatched_at ? new Date(vendor.last_dispatched_at).toLocaleString() : "None yet"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-[30px] border border-black/[0.06] bg-white p-7">
      <p className="uppercase tracking-[0.24em] text-zinc-400 text-[10px]">
        {title}
      </p>
      <h2 className="text-[42px] font-semibold tracking-tight mt-5">{value}</h2>
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-[18px] bg-white border border-black/[0.06] p-3">
      <p className="text-zinc-400 text-[9px] uppercase tracking-[0.18em]">
        {title}
      </p>
      <p className="text-[20px] font-semibold mt-2">{value}</p>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <div className="h-[30px] px-3 rounded-full bg-white border border-black/[0.06] flex items-center">
      {label}
    </div>
  );
}
