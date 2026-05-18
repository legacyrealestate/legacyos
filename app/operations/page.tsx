"use client";

import { useEffect, useState } from "react";

import AppShell from "@/app/components/AppShell";

import OperationsTimeline from "@/app/components/OperationsTimeline";

import useRealtime from "@/app/hooks/useRealtime";

export default function OperationsPage() {

  const [operations, setOperations] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const loadOperations =
    async () => {

      try {

        const res =
          await fetch(
            "/api/operations"
          );

        const data =
          await res.json();

        setOperations(
          data || []
        );

      } catch (error) {

        console.error(error);

      }

      setLoading(false);

    };

  useEffect(() => {

    loadOperations();

  }, []);

  useRealtime(
    "operations_feed",
    loadOperations
  );

  return (
    <AppShell>

      {/* HERO */}

      <div className="rounded-[40px] border border-black/[0.06] bg-white p-6 md:p-10">

        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">

          <div>

            <p className="uppercase tracking-[0.28em] text-zinc-400 text-[10px]">
              Infrastructure Timeline
            </p>

            <h1 className="text-[38px] md:text-[58px] font-semibold tracking-tight mt-5">
              Operations
            </h1>

            <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
              Live autonomous operational events,
              escalations,
              workflows,
              dispatches,
              and infrastructure activity.
            </p>

          </div>

          <div className="h-[44px] px-5 rounded-full bg-black text-white text-[11px] flex items-center justify-center">
            LIVE TIMELINE
          </div>

        </div>

      </div>

      {/* LOADING */}

      {loading && (

        <div className="rounded-[34px] border border-black/[0.06] bg-white p-10 mt-8">

          <p className="text-zinc-500">
            Loading operations timeline...
          </p>

        </div>

      )}

      {/* EMPTY */}

      {!loading &&
        operations.length === 0 && (

        <div className="rounded-[34px] border border-black/[0.06] bg-white p-10 mt-8">

          <h2 className="text-[28px] font-semibold">
            No Operations Yet
          </h2>

          <p className="text-zinc-500 text-[14px] mt-4">
            LegacyOS is waiting for
            operational activity.
          </p>

        </div>

      )}

      {/* TIMELINE */}

      {!loading &&
        operations.length > 0 && (

        <div className="mt-8">

          <OperationsTimeline
            operations={
              operations
            }
          />

        </div>

      )}

    </AppShell>
  );
}