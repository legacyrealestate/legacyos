"use client";

import { useEffect, useState } from "react";

import AppShell from "@/app/components/AppShell";
import VendorDispatchModal from "@/app/components/VendorDispatchModal";

const TICKET_STATUS_OPTIONS = [
  "New",
  "Open",
  "Needs Review",
  "Vendor Recommended",
  "Failed",
  "In Progress",
  "Resolved",
  "Closed",
  "Emergency Escalated",
];

type Call = {
  id: string;
  tenant_name: string;
  phone: string;
  issue: string;
  urgency: string;
  ai_summary?: string | null;
  transcript?: string | null;
  status: string;
  assigned_vendor_name?: string | null;
  dispatch_status?: string | null;
};

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});

  async function loadCalls() {
    const res = await fetch("/api/calls");
    const data = await res.json();
    setCalls(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialCalls() {
      const res = await fetch("/api/calls");
      const data = await res.json();
      if (cancelled) return;
      setCalls(Array.isArray(data) ? data : []);
      setLoading(false);
    }

    loadInitialCalls();
    return () => {
      cancelled = true;
    };
  }, []);

  async function updateTicket(call: Call, status: string) {
    setBusyTicketId(call.id);
    setError("");

    const res = await fetch(`/api/tickets/${call.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        note: notes[call.id] || undefined,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Unable to update ticket.");
      setBusyTicketId(null);
      return;
    }

    setNotes((current) => ({ ...current, [call.id]: "" }));
    await loadCalls();
    setBusyTicketId(null);
  }

  async function recordManualContact(call: Call) {
    setBusyTicketId(call.id);
    setError("");

    const res = await fetch(`/api/tickets/${call.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "manual_contact",
        note: notes[call.id] || undefined,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Unable to record manual vendor contact.");
      setBusyTicketId(null);
      return;
    }

    setNotes((current) => ({ ...current, [call.id]: "" }));
    await loadCalls();
    setBusyTicketId(null);
  }

  async function escalateForReview(ticketId: string) {
    setBusyTicketId(ticketId);
    setError("");

    const res = await fetch("/api/escalation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId }),
    });
    const data = await res.json();

    if (!res.ok) setError(data.error || "Unable to create review escalation.");
    await loadCalls();
    setBusyTicketId(null);
  }

  return (
    <AppShell>
      <div className="rounded-[24px] border border-black/[0.06] bg-white p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">
              Supervised Voice Intake
            </p>
            <h1 className="text-[38px] md:text-[52px] font-semibold tracking-tight mt-5">
              AI Calls
            </h1>
            <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
              ElevenLabs maintenance intake, staff review, vendor recommendations, and human-approved notifications.
            </p>
          </div>
          <div className="h-[38px] px-4 rounded-full bg-black text-white text-[11px] flex items-center">
            PILOT OPS
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-8">
        <StatCard title="Total Calls" value={calls.length} />
        <StatCard title="Emergencies" value={calls.filter((call) => call.urgency === "Emergency").length} />
        <StatCard title="Escalated" value={calls.filter((call) => call.status?.includes("Escalated")).length} />
        <StatCard title="Assigned" value={calls.filter((call) => call.assigned_vendor_name).length} />
      </div>

      {error && (
        <div className="rounded-[24px] border border-red-100 bg-red-50 p-5 mt-8 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-[24px] border border-black/[0.06] bg-white p-8 mt-8">
          <p className="text-zinc-500 text-[15px]">Loading operational tickets...</p>
        </div>
      )}

      <div className="space-y-5 mt-8">
        {calls.map((call) => {
          const statusDraft = statusDrafts[call.id] || call.status || "Needs Review";
          const dispatchLabel = call.dispatch_status || "Needs Approval";
          const summary = call.ai_summary || "No AI summary was provided by the signed intake event.";
          const transcript = call.transcript || "No transcript was provided by the signed intake event.";

          return (
            <div key={call.id} className="rounded-[24px] border border-black/[0.06] bg-white p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-[26px] font-semibold tracking-tight">{call.tenant_name}</h2>
                    {call.urgency === "Emergency" && (
                      <div className="h-[30px] px-3 rounded-full bg-red-600 text-white text-[10px] flex items-center">
                        EMERGENCY
                      </div>
                    )}
                  </div>
                  <p className="text-zinc-500 text-[14px] mt-3">{call.phone || "No phone recorded"}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <StatusPill label={call.urgency} dark />
                  <StatusPill label={call.status} />
                  <StatusPill label={dispatchLabel} />
                </div>
              </div>

              {call.urgency === "Emergency" && (
                <div className="rounded-[20px] border border-red-100 bg-red-50 p-5 mt-6 text-sm text-red-800">
                  Emergency review is unacknowledged until staff records action. LegacyOS does not contact emergency services; external emergency procedures remain required.
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 mt-7">
                <div className="space-y-5">
                  <InfoPanel title="Maintenance Issue">{call.issue}</InfoPanel>
                  <InfoPanel title="Intake Summary">{summary}</InfoPanel>
                  <InfoPanel title="Transcript">{transcript}</InfoPanel>
                </div>

                <div className="rounded-[20px] border border-black/[0.06] bg-[#fafafa] p-5">
                  <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">Ticket Controls</p>
                  <p className="text-sm text-zinc-600 mt-4">
                    Vendor: {call.assigned_vendor_name || "No vendor assigned"}
                  </p>

                  <label className="block mt-5 text-[12px] text-zinc-500">
                    Status
                    <select
                      value={statusDraft}
                      onChange={(event) =>
                        setStatusDrafts((current) => ({ ...current, [call.id]: event.target.value }))
                      }
                      className="mt-2 h-[46px] w-full rounded-2xl border border-black/[0.08] bg-white px-4 text-sm outline-none"
                    >
                      {TICKET_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block mt-4 text-[12px] text-zinc-500">
                    Staff note
                    <textarea
                      value={notes[call.id] || ""}
                      onChange={(event) =>
                        setNotes((current) => ({ ...current, [call.id]: event.target.value }))
                      }
                      rows={4}
                      className="mt-2 w-full rounded-2xl border border-black/[0.08] bg-white p-4 text-sm outline-none"
                      placeholder="Record the decision, contact attempt, or follow-up."
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-3 mt-5">
                    <button
                      onClick={() => updateTicket(call, statusDraft)}
                      disabled={busyTicketId === call.id}
                      className="h-[46px] rounded-2xl bg-black text-white text-[13px] font-medium disabled:opacity-50"
                    >
                      Save Status
                    </button>
                    <button
                      onClick={() => setSelectedTicket(call.id)}
                      className="h-[46px] rounded-2xl border border-black/[0.08] bg-white text-[13px] font-medium"
                    >
                      Review Vendor
                    </button>
                    <button
                      onClick={() => recordManualContact(call)}
                      disabled={busyTicketId === call.id}
                      className="h-[46px] rounded-2xl border border-black/[0.08] bg-white text-[13px] font-medium disabled:opacity-50"
                    >
                      Manual Contact
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => updateTicket(call, "Resolved")}
                        disabled={busyTicketId === call.id}
                        className="h-[44px] rounded-2xl border border-black/[0.08] bg-white text-[13px] disabled:opacity-50"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => updateTicket(call, "Open")}
                        disabled={busyTicketId === call.id}
                        className="h-[44px] rounded-2xl border border-black/[0.08] bg-white text-[13px] disabled:opacity-50"
                      >
                        Reopen
                      </button>
                    </div>
                    <button
                      onClick={() => escalateForReview(call.id)}
                      disabled={busyTicketId === call.id}
                      className="h-[46px] rounded-2xl border border-red-100 bg-red-50 text-red-700 text-[13px] disabled:opacity-50"
                    >
                      Emergency Review
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedTicket && (
        <VendorDispatchModal
          ticketId={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onComplete={loadCalls}
        />
      )}
    </AppShell>
  );
}

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-black/[0.06] bg-[#fafafa] p-5">
      <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">{title}</p>
      <p className="text-zinc-600 text-[14px] leading-relaxed mt-4 whitespace-pre-wrap max-h-[240px] overflow-y-auto">
        {children}
      </p>
    </div>
  );
}

function StatusPill({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <div
      className={`h-[34px] px-4 rounded-full text-[11px] flex items-center ${
        dark ? "bg-black text-white" : "border border-black/[0.08] bg-[#fafafa] text-zinc-700"
      }`}
    >
      {label}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-[24px] border border-black/[0.06] bg-white p-6">
      <p className="uppercase tracking-[0.24em] text-zinc-400 text-[10px]">{title}</p>
      <h2 className="text-[36px] font-semibold tracking-tight mt-5">{value}</h2>
    </div>
  );
}
