"use client";

import { useEffect, useRef } from "react";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function useRealtime(
  table: string,
  callback: () => void
) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {

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
