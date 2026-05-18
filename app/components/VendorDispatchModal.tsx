"use client";

import { useState } from "react";

export default function VendorDispatchModal({
  ticketId,
  open,
  onClose,
}: any) {

  const [loading, setLoading] =
    useState(false);

  if (!open) return null;

  const dispatchVendor =
    async () => {

      try {

        setLoading(true);

        await fetch(
          "/api/vendor-dispatch",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              ticketId,
            }),
          }
        );

        /*
          CLOSE MODAL
        */

        onClose();

      } catch (error) {

        console.error(error);

      }

      setLoading(false);

    };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-6">

      {/* BACKDROP */}

      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* MODAL */}

      <div className="relative z-[1000] w-full max-w-xl rounded-[36px] bg-white border border-black/[0.06] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">

        <div className="flex items-center justify-between">

          <div>

            <p className="uppercase tracking-[0.24em] text-zinc-400 text-[10px]">
              Autonomous Dispatch
            </p>

            <h2 className="text-[36px] font-semibold tracking-tight mt-4">
              Vendor Dispatch
            </h2>

          </div>

          <button
            onClick={onClose}
            className="h-[42px] w-[42px] rounded-full border border-black/[0.06] hover:scale-[1.05] transition-all duration-300 ease-out"
          >
            ✕
          </button>

        </div>

        {/* CONTENT */}

        <div className="rounded-[30px] border border-black/[0.06] bg-[#fafafa] p-7 mt-8">

          <p className="text-zinc-700 text-[14px] leading-relaxed">
            LegacyOS will autonomously route,
            prioritize,
            and dispatch the most operationally
            efficient vendor based on urgency,
            workload,
            infrastructure risk,
            and vendor availability.
          </p>

        </div>

        {/* BUTTONS */}

        <div className="flex flex-wrap gap-4 mt-8">

          <button
            onClick={dispatchVendor}
            disabled={loading}
            className="h-[54px] px-6 rounded-2xl bg-black text-white text-[14px] font-medium transition-all duration-300 ease-out hover:scale-[1.02] disabled:opacity-50"
          >
            {loading
              ? "Dispatching..."
              : "Dispatch Vendor"}
          </button>

          <button
            onClick={onClose}
            className="h-[54px] px-6 rounded-2xl border border-black/[0.08] bg-[#fafafa] text-[14px] transition-all duration-300 ease-out hover:scale-[1.02]"
          >
            Cancel
          </button>

        </div>

      </div>

    </div>
  );
}