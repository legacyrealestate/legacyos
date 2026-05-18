"use client";

import { useEffect, useState } from "react";
import { realtime } from "@/lib/realtime";

export default function ToastProvider() {

  const [toast, setToast] =
    useState<any>(null);

  useEffect(() => {

    const channel =
      realtime
        .channel("toast-live")

        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table:
              "notifications",
          },
          (payload) => {

            setToast(
              payload.new
            );

            setTimeout(() => {
              setToast(null);
            }, 5000);

          }
        )

        .subscribe();

    return () => {
      realtime.removeChannel(
        channel
      );
    };

  }, []);

  if (!toast) return null;

  return (
    <div className="fixed top-6 right-6 z-[999]">

      <div className="w-[380px] rounded-[28px] border border-black/[0.06] bg-white shadow-2xl p-6">

        <div className="flex items-start gap-4">

          <div className="w-3 h-3 rounded-full bg-black mt-2"></div>

          <div>

            <p className="text-[15px] font-semibold">
              {toast.title}
            </p>

            <p className="text-zinc-500 text-[13px] mt-2 leading-relaxed">
              {toast.description}
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}