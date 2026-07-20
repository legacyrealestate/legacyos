"use client";

import { useEffect, useRef } from "react";

import { getRealtimeClient } from "@/lib/realtime";

export default function useRealtime(
  table: string,
  callback: () => void
) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    let supabase;
    try {
      supabase = getRealtimeClient();
    } catch {
      return;
    }
    const channel =
      supabase
        .channel(
          `realtime-${table}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
          },
          () => {
            callbackRef.current();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };

  }, [table]);

}
