"use client";

import AppShell from "@/app/components/AppShell";
import { useEffect, useState } from "react";

const categories = ["General", "Leasing", "Maintenance", "Residents", "Owners", "Documents", "Buildium", "AI", "SMS", "Email", "Reporting"];
const priorities = ["Low", "Medium", "High", "Urgent"];
const statuses = ["Requested", "Approved", "In Progress", "Planned", "Completed", "On Hold"];

export default function RoadmapPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  async function loadRequests() {
    const res = await fetch("/api/client-requests");
    const data = await res.json();
    setRequests(data.requests || []);
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function addRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    await fetch("/api/client-requests", {
      method: "POST",
      body: JSON.stringify({
        title: formData.get("title"),
        description: formData.get("description"),
        category: formData.get("category"),
        priority: formData.get("priority"),
        status: formData.get("status"),
        requested_by: formData.get("requested_by"),
        notes: formData.get("notes"),
      }),
      headers: { "Content-Type": "application/json" },
    });

    form.reset();
    setSaving(false);
    loadRequests();
  }

  return (
    <AppShell>
      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">
        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">LegacyOS Roadmap</p>
        <h1 className="text-[44px] md:text-[58px] font-semibold tracking-tight mt-5">
          Client Requests
        </h1>
        <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
          Add, track, and prioritize features Legacy wants added as the platform grows.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6 mt-8">
        <form onSubmit={addRequest} className="rounded-[34px] border border-black/[0.06] bg-white p-8">
          <h2 className="text-2xl font-semibold">Add Request</h2>

          <input name="title" required placeholder="Feature title" className="mt-6 h-[52px] w-full rounded-2xl border border-black/[0.08] bg-[#fafafa] px-4" />

          <textarea name="description" placeholder="What should be added?" className="mt-4 min-h-[110px] w-full rounded-2xl border border-black/[0.08] bg-[#fafafa] p-4" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <select name="category" className="h-[52px] rounded-2xl border border-black/[0.08] bg-[#fafafa] px-4">
              {categories.map((x) => <option key={x}>{x}</option>)}
            </select>

            <select name="priority" className="h-[52px] rounded-2xl border border-black/[0.08] bg-[#fafafa] px-4">
              {priorities.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>

          <select name="status" className="mt-4 h-[52px] w-full rounded-2xl border border-black/[0.08] bg-[#fafafa] px-4">
            {statuses.map((x) => <option key={x}>{x}</option>)}
          </select>

          <input name="requested_by" placeholder="Requested by" defaultValue="Legacy Team" className="mt-4 h-[52px] w-full rounded-2xl border border-black/[0.08] bg-[#fafafa] px-4" />

          <textarea name="notes" placeholder="Internal notes" className="mt-4 min-h-[90px] w-full rounded-2xl border border-black/[0.08] bg-[#fafafa] p-4" />

          <button disabled={saving} className="mt-6 h-[52px] w-full rounded-2xl bg-black text-white text-sm disabled:opacity-50">
            {saving ? "Saving..." : "Save Request"}
          </button>
        </form>

        <div className="rounded-[34px] border border-black/[0.06] bg-white p-8">
          <h2 className="text-2xl font-semibold">Requested Features</h2>

          <div className="space-y-4 mt-6">
            {requests.map((item) => (
              <div key={item.id} className="rounded-2xl bg-[#fafafa] border border-black/[0.06] p-5">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-black text-white text-xs px-3 py-1">{item.priority}</span>
                  <span className="rounded-full bg-white border border-black/[0.08] text-xs px-3 py-1">{item.category}</span>
                  <span className="rounded-full bg-white border border-black/[0.08] text-xs px-3 py-1">{item.status}</span>
                </div>
                <h3 className="text-lg font-semibold mt-4">{item.title}</h3>
                <p className="text-sm text-zinc-500 mt-2">{item.description}</p>
                {item.notes && <p className="text-xs text-zinc-400 mt-3">Notes: {item.notes}</p>}
              </div>
            ))}

            {requests.length === 0 && (
              <div className="rounded-2xl bg-[#fafafa] border border-black/[0.06] p-5 text-sm text-zinc-500">
                No requests yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
