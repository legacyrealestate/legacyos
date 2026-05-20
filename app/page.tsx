"use client";

import { useEffect, useState } from "react";

import AppShell from "@/app/components/AppShell";
import useRealtime from "@/app/hooks/useRealtime";

import { supabase } from "@/lib/supabase";

export default function DashboardPage() {

  const [data, setData] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  const loadDashboard =
    async () => {

      try {

        const res =
          await fetch(
            "/api/dashboard"
          );

        const dashboard =
          await res.json();

        setData(dashboard);

      } catch (error) {

        console.error(error);

      }

      setLoading(false);

    };

  useEffect(() => {

    loadDashboard();

  }, []);

  useRealtime(
    "maintenance_tickets",
    loadDashboard
  );

  useRealtime(
    "notifications",
    loadDashboard
  );

  useRealtime(
    "operations_feed",
    loadDashboard
  );

  const startSimulation =
    async () => {

      await fetch(
        "/api/simulate",
        {
          method: "POST",
        }
      );

    };

  /*
    LOGOUT
  */

  const logout =
    async () => {

      await supabase.auth.signOut();

      window.location.href =
        "/login";

    };

  if (loading || !data) {

    return (
      <AppShell>

        <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">

          <p className="text-zinc-500">
            Loading operational intelligence...
          </p>

        </div>

      </AppShell>
    );
  }

  return (
    <AppShell>

      <div className="rounded-[42px] border border-black/[0.06] bg-white p-10">

        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-8">

          <div>

            <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">
              Autonomous Infrastructure
            </p>

            <h1 className="text-[38px] md:text-[64px] font-semibold tracking-tight mt-5">
              LegacyOS
            </h1>

            <p className="text-zinc-500 text-[16px] leading-relaxed mt-5 max-w-3xl">
              AI-powered operational intelligence
              system for maintenance, escalations,
              property infrastructure, vendor
              coordination, and tenant workflows.
            </p>

          </div>

          <div className="flex flex-wrap gap-4">

            <button
              onClick={
                startSimulation
              }
              className="h-[54px] px-6 rounded-2xl bg-black text-white text-[13px]"
            >
              Start Live Simulation
            </button>

            <button
              onClick={logout}
              className="h-[54px] px-6 rounded-2xl border border-black/[0.08] bg-[#fafafa] text-[13px]"
            >
              Logout
            </button>

            <div className="h-[54px] px-6 rounded-2xl border border-black/[0.08] bg-[#fafafa] text-[12px] flex items-center">
              LIVE SYSTEMS
            </div>

          </div>

        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-5 mt-8">

        <MetricCard
          title="Calls"
          value={
            data.metrics.totalCalls
          }
        />

        <MetricCard
          title="Emergencies"
          value={
            data.metrics.emergencies
          }
        />

        <MetricCard
          title="Escalated"
          value={
            data.metrics.escalated
          }
        />

        <MetricCard
          title="Vendors"
          value={
            data.metrics.vendors
          }
        />

        <MetricCard
          title="Properties"
          value={
            data.metrics.properties
          }
        />

        <MetricCard
          title="Alerts"
          value={
            data.metrics
              .notifications
          }
        />

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">

        <div className="rounded-[36px] border border-black/[0.06] bg-white p-8">

          <div className="flex items-center justify-between">

            <div>

              <p className="uppercase tracking-[0.24em] text-zinc-400 text-[10px]">
                Live Operations
              </p>

              <h2 className="text-[32px] font-semibold tracking-tight mt-4">
                Operations Feed
              </h2>

            </div>

            <div className="h-[34px] px-4 rounded-full bg-black text-white text-[10px] flex items-center">
              LIVE
            </div>

          </div>

          <div className="space-y-4 mt-8">

            {data.operations
              ?.slice(0, 6)
              ?.map(
                (
                  item: any,
                  index: number
                ) => (

                  <div
                    key={index}
                    className="rounded-[24px] border border-black/[0.06] bg-[#fafafa] p-5"
                  >

                    <div className="flex items-center justify-between gap-4">

                      <h3 className="text-[15px] font-medium">
                        {
                          item.title
                        }
                      </h3>

                      <div className="h-[28px] px-3 rounded-full bg-black text-white text-[10px] flex items-center">
                        {
                          item.type
                        }
                      </div>

                    </div>

                    <p className="text-zinc-500 text-[13px] leading-relaxed mt-4">
                      {
                        item.description
                      }
                    </p>

                  </div>

                )
              )}

          </div>

        </div>

        <div className="rounded-[36px] border border-black/[0.06] bg-white p-8">

          <p className="uppercase tracking-[0.24em] text-zinc-400 text-[10px]">
            Autonomous Systems
          </p>

          <h2 className="text-[32px] font-semibold tracking-tight mt-4">
            AI Infrastructure
          </h2>

          <div className="space-y-4 mt-8">

            <SystemCard
              title="Operational AI"
              status="Analyzing"
            />

            <SystemCard
              title="Realtime Sync"
              status="Live"
            />

            <SystemCard
              title="Voice Infrastructure"
              status="Online"
            />

            <SystemCard
              title="Vendor Routing"
              status="Connected"
            />

            <SystemCard
              title="Escalation Engine"
              status="Autonomous"
            />

            <SystemCard
              title="Risk Monitoring"
              status="Active"
            />

          </div>

        </div>

      </div>

    </AppShell>
  );
}

function MetricCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {

  return (
    <div className="rounded-[30px] border border-black/[0.06] bg-white p-7">

      <p className="uppercase tracking-[0.24em] text-zinc-400 text-[10px]">
        {title}
      </p>

      <h2 className="text-[42px] font-semibold tracking-tight mt-5">
        {value}
      </h2>

    </div>
  );
}

function SystemCard({
  title,
  status,
}: {
  title: string;
  status: string;
}) {

  return (
    <div className="rounded-[24px] border border-black/[0.06] bg-[#fafafa] p-5 flex items-center justify-between">

      <p className="text-[14px]">
        {title}
      </p>

      <div className="h-[30px] px-4 rounded-full bg-black text-white text-[10px] flex items-center">
        {status}
      </div>

    </div>
  );
}
