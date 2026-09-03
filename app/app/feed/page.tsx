"use client";

import { useEffect, useState } from "react";
import AppShell from "@/app/components/AppShell";

type FeedEvent = {
  id: string;
  title?: string;
  description?: string;
  created_at?: string;
};

export default function FeedPage() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFeed() {
      const res = await fetch("/api/feed");
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) setError(data.error || "Unable to load feed.");
      else setEvents(Array.isArray(data) ? data : []);
      setLoading(false);
    }

    loadFeed();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>

      <div className="rounded-[36px] border border-black/[0.06] bg-white p-10">

        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">
          Live Operational Intelligence
        </p>

        <h1 className="text-[52px] font-semibold tracking-tight mt-5">
          Operations Feed
        </h1>

      </div>

      <div className="space-y-4 mt-8">
        {loading && <p className="text-sm text-zinc-500">Loading activity...</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}

        {events.map((event) => (

          <div
            key={event.id}
            className="rounded-[28px] border border-black/[0.06] bg-white p-6 flex items-center justify-between"
          >

            <div>

              <p className="text-[16px] font-semibold">
                {event.title || "Activity"}
              </p>

              <p className="text-zinc-500 text-[14px] mt-2">
                {event.description || "No description provided."}
              </p>

            </div>

            <p className="text-zinc-400 text-[12px]">
              {event.created_at
                ? new Date(event.created_at).toLocaleString()
                : "Time unavailable"}
            </p>

          </div>

        ))}

      </div>

    </AppShell>
  );
}
