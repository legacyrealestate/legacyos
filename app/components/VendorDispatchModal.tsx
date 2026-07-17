"use client";

import { useEffect, useState } from "react";

type VendorRecommendation = {
  id: string;
  name: string;
  trade?: string | null;
  phone?: string | null;
  email?: string | null;
  score: number;
};

export default function VendorDispatchModal({
  ticketId,
  onClose,
  onComplete,
}: {
  ticketId: string;
  onClose: () => void;
  onComplete?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [vendors, setVendors] = useState<VendorRecommendation[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<{
    notificationStatus?: string;
    status?: string;
    providerMessageSid?: string;
    preview?: { to?: string; body?: string };
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      const res = await fetch("/api/vendor-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });
      const data = await res.json();

      if (cancelled) return;
      if (!res.ok) {
        setError(data.error || "Unable to load vendor recommendations.");
      } else {
        setVendors(data.recommendations || []);
        setSelectedVendorId(data.recommendations?.[0]?.id || "");
      }
      setLoading(false);
    }

    loadRecommendations();
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  async function approveVendor() {
    setApproving(true);
    setError("");

    const res = await fetch("/api/vendor-dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, vendorId: selectedVendorId, approve: true }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Unable to approve vendor.");
      setApproving(false);
      return;
    }

    setOutcome({
      notificationStatus: data.notificationStatus,
      status: data.status,
      providerMessageSid: data.providerMessageSid,
      preview: data.preview,
    });
    onComplete?.();
    setApproving(false);
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-6">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative z-[1000] w-full max-w-2xl rounded-[24px] bg-white border border-black/[0.06] p-6 md:p-8 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="uppercase tracking-[0.24em] text-zinc-400 text-[10px]">Human Approval Required</p>
            <h2 className="text-[30px] font-semibold tracking-tight mt-3">Vendor Recommendation</h2>
          </div>

          <button onClick={onClose} className="h-[42px] w-[42px] rounded-full border border-black/[0.06]">
            X
          </button>
        </div>

        <div className="rounded-[20px] border border-black/[0.06] bg-[#fafafa] p-5 mt-6 text-sm text-zinc-700">
          LegacyOS ranks active vendors for staff review. Approval queues notification work; it does not label a vendor dispatched until contact succeeds or is manually recorded.
        </div>

        {loading && <p className="text-sm text-zinc-500 mt-6">Loading recommendations...</p>}
        {error && <div className="rounded-2xl bg-red-50 text-red-700 p-4 text-sm mt-6">{error}</div>}
        {outcome && (
          <div className="rounded-2xl bg-emerald-50 text-emerald-800 p-4 text-sm mt-6">
            <p className="font-medium">
              {outcome.notificationStatus || outcome.status || "Vendor approval recorded."}
            </p>
            {outcome.preview && (
              <div className="mt-3 text-emerald-900">
                <p>Outbound messaging is disabled. Preview only:</p>
                <p className="mt-2">To: {outcome.preview.to || "No vendor phone"}</p>
                <p className="mt-2 whitespace-pre-wrap">{outcome.preview.body}</p>
              </div>
            )}
            {outcome.providerMessageSid && <p className="mt-2">MessageSid: {outcome.providerMessageSid}</p>}
          </div>
        )}

        {!loading && vendors.length === 0 && !error && (
          <div className="rounded-2xl bg-amber-50 text-amber-800 p-4 text-sm mt-6">
            No active matching vendors were found.
          </div>
        )}

        <div className="space-y-3 mt-6">
          {vendors.map((vendor, index) => (
            <label key={vendor.id} className="flex items-start gap-3 rounded-2xl border border-black/[0.06] bg-white p-4">
              <input
                type="radio"
                name="vendor"
                checked={selectedVendorId === vendor.id}
                onChange={() => setSelectedVendorId(vendor.id)}
                className="mt-1"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-zinc-900">{vendor.name}</p>
                  {index === 0 && <span className="rounded-full bg-black px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white">Recommended</span>}
                </div>
                <p className="text-sm text-zinc-500 mt-1">
                  {vendor.trade || "General"} - score {vendor.score} - {vendor.phone || vendor.email || "No contact listed"}
                </p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 mt-8">
          <button
            onClick={approveVendor}
            disabled={approving || !selectedVendorId}
            className="h-[52px] px-6 rounded-2xl bg-black text-white text-[14px] font-medium disabled:opacity-50"
          >
            {approving ? "Approving..." : "Approve Selected Vendor"}
          </button>

          <button onClick={onClose} className="h-[52px] px-6 rounded-2xl border border-black/[0.08] bg-[#fafafa] text-[14px]">
            {outcome ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
