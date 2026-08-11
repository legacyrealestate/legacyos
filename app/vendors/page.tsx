"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import AppShell from "@/app/components/AppShell";

type Vendor = {
  id: string;
  name: string;
  trade?: string | null;
  phone?: string | null;
  email?: string | null;
  dispatch_keywords?: string[] | null;
  priority?: string | null;
  emergency_available?: boolean | null;
  active?: boolean | null;
  open_jobs?: number | null;
  total_dispatched?: number | null;
  last_dispatched_at?: string | null;
};

type VendorForm = {
  id: string;
  name: string;
  trade: string;
  phone: string;
  email: string;
  priority: string;
  dispatchKeywords: string;
  emergencyAvailable: boolean;
  active: boolean;
};

const emptyForm: VendorForm = {
  id: "",
  name: "",
  trade: "General",
  phone: "",
  email: "",
  priority: "Standard",
  dispatchKeywords: "",
  emergencyAvailable: false,
  active: true,
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<VendorForm>(emptyForm);
  const [role, setRole] = useState<"admin" | "staff" | null>(null);

  async function loadVendors() {
    const res = await fetch("/api/vendors");
    const data = await res.json();

    if (!res.ok) setError(data.error || "Unable to load vendors.");
    else setVendors(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialVendors() {
      const [vendorsRes, meRes] = await Promise.all([fetch("/api/vendors"), fetch("/api/me")]);
      const data = await vendorsRes.json();
      const me = await meRes.json();

      if (cancelled) return;
      if (!vendorsRes.ok) setError(data.error || "Unable to load vendors.");
      else setVendors(Array.isArray(data) ? data : []);
      if (meRes.ok && me.role === "admin") setRole("admin");
      else setRole("staff");
      setLoading(false);
    }

    loadInitialVendors();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return vendors.filter((vendor) => {
      const text = `${vendor.name} ${vendor.trade || ""} ${vendor.phone || ""} ${vendor.email || ""} ${vendor.priority || ""}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [vendors, search]);

  const trades = Array.from(new Set(filtered.map((vendor) => vendor.trade || "General")));
  const missingContact = vendors.filter((vendor) => !vendor.phone && !vendor.email).length;

  function editVendor(vendor: Vendor) {
    setForm({
      id: vendor.id,
      name: vendor.name,
      trade: vendor.trade || "General",
      phone: vendor.phone || "",
      email: vendor.email || "",
      priority: vendor.priority || "Standard",
      dispatchKeywords: (vendor.dispatch_keywords || []).join(", "),
      emergencyAvailable: vendor.emergency_available === true,
      active: vendor.active !== false,
    });
    setMessage("");
    setError("");
  }

  async function saveVendor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      vendorId: form.id || undefined,
      name: form.name,
      trade: form.trade,
      phone: form.phone || undefined,
      email: form.email || undefined,
      priority: form.priority,
      dispatch_keywords: form.dispatchKeywords
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean),
      emergency_available: form.emergencyAvailable,
      active: form.active,
    };

    const res = await fetch("/api/vendors", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Unable to save vendor.");
      setSaving(false);
      return;
    }

    setForm(emptyForm);
    setMessage(form.id ? "Vendor updated." : "Vendor created.");
    await loadVendors();
    setSaving(false);
  }

  async function deactivateVendor(vendor: Vendor) {
    setSaving(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/vendors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId: vendor.id, active: false }),
    });
    const data = await res.json();

    if (!res.ok) setError(data.error || "Unable to deactivate vendor.");
    else {
      setMessage("Vendor deactivated.");
      await loadVendors();
    }
    setSaving(false);
  }

  return (
    <AppShell>
      <div className="rounded-[24px] border border-black/[0.06] bg-white p-6 md:p-8">
        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">Vendor Review</p>
        <h1 className="text-[38px] md:text-[52px] font-semibold tracking-tight mt-5">Vendors</h1>
        <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
          Active maintenance vendors available for staff-approved recommendations and notifications.
        </p>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search vendor, trade, phone, email..."
          className="mt-8 w-full h-[56px] rounded-2xl border border-black/[0.08] bg-[#fafafa] px-5 text-[14px] outline-none"
        />
        {missingContact > 0 && <p className="mt-4 text-sm text-amber-800">{missingContact} vendor{missingContact === 1 ? "" : "s"} need a phone number or email before they can be contacted. The imported directory did not invent contact details.</p>}
      </div>

      {role === "admin" && (
      <form onSubmit={saveVendor} className="rounded-[24px] border border-black/[0.06] bg-white p-6 md:p-8 mt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">Admin Vendor Management</p>
            <h2 className="text-[28px] font-semibold tracking-tight mt-3">
              {form.id ? "Edit Vendor" : "Create Vendor"}
            </h2>
          </div>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(emptyForm)}
              className="h-[42px] px-4 rounded-2xl border border-black/[0.08] bg-[#fafafa] text-[13px]"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
          <TextField label="Name" value={form.name} required onChange={(value) => setForm({ ...form, name: value })} />
          <TextField label="Trade" value={form.trade} onChange={(value) => setForm({ ...form, trade: value })} />
          <TextField label="Phone (E.164)" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
          <TextField label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
          <TextField label="Priority" value={form.priority} onChange={(value) => setForm({ ...form, priority: value })} />
          <TextField
            label="Keywords"
            value={form.dispatchKeywords}
            onChange={(value) => setForm({ ...form, dispatchKeywords: value })}
          />
          <label className="flex items-center gap-3 rounded-2xl border border-black/[0.08] bg-[#fafafa] px-4 h-[54px] text-sm">
            <input
              type="checkbox"
              checked={form.emergencyAvailable}
              onChange={(event) => setForm({ ...form, emergencyAvailable: event.target.checked })}
            />
            Emergency available
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-black/[0.08] bg-[#fafafa] px-4 h-[54px] text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm({ ...form, active: event.target.checked })}
            />
            Active
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-6">
          <button
            disabled={saving}
            className="h-[48px] px-6 rounded-2xl bg-black text-white text-[14px] font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : form.id ? "Update Vendor" : "Create Vendor"}
          </button>
          {error && <p className="text-sm text-red-700">{error}</p>}
          {message && <p className="text-sm text-emerald-700">{message}</p>}
        </div>
      </form>
      )}

      {loading && <Panel>Loading vendors...</Panel>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-8">
            <MetricCard title="Total Vendors" value={vendors.length} />
            <MetricCard title="Trades" value={trades.length} />
            <MetricCard title="Open Jobs" value={vendors.reduce((sum, vendor) => sum + (vendor.open_jobs || 0), 0)} />
            <MetricCard title="Needs Contact" value={missingContact} />
          </div>

          <div className="space-y-8 mt-8">
            {trades.map((trade) => {
              const tradeVendors = filtered.filter((vendor) => (vendor.trade || "General") === trade);

              return (
                <section key={trade} className="rounded-[24px] border border-black/[0.06] bg-white p-6 md:p-8">
                  <div className="flex items-center justify-between gap-5">
                    <div>
                      <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">Trade</p>
                      <h2 className="text-[28px] font-semibold tracking-tight mt-3">{trade}</h2>
                    </div>
                    <div className="h-[36px] px-4 rounded-full bg-black text-white text-[11px] flex items-center">
                      {tradeVendors.length} Vendors
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-7">
                    {tradeVendors.map((vendor) => (
                      <div key={vendor.id} className="rounded-[20px] border border-black/[0.06] bg-[#fafafa] p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-[22px] font-semibold tracking-tight">{vendor.name}</h3>
                            <p className="text-zinc-500 text-[13px] mt-3">
                              {vendor.priority || "Standard"} - {vendor.active === false ? "Inactive" : "Active"}
                            </p>
                          </div>
                          <div className="h-[30px] px-3 rounded-full bg-white border border-black/[0.06] text-[10px] flex items-center">
                            {vendor.emergency_available ? "Emergency" : "Standard"}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-5">
                          <MiniStat title="Open" value={vendor.open_jobs || 0} />
                          <MiniStat title="Total" value={vendor.total_dispatched || 0} />
                        </div>

                        <div className="mt-5 space-y-2 text-[13px] text-zinc-600">
                          <p><span className="text-zinc-400">Phone:</span> {vendor.phone ? <a className="text-emerald-700 underline" href={`tel:${vendor.phone}`}>{vendor.phone}</a> : "Needs contact"}</p>
                          <p><span className="text-zinc-400">Email:</span> {vendor.email ? <a className="text-emerald-700 underline" href={`mailto:${vendor.email}`}>{vendor.email}</a> : "Needs contact"}</p>
                          <p><span className="text-zinc-400">Keywords:</span> {(vendor.dispatch_keywords || []).join(", ") || "None"}</p>
                          <p><span className="text-zinc-400">Last Notification:</span> {vendor.last_dispatched_at ? new Date(vendor.last_dispatched_at).toLocaleString() : "None yet"}</p>
                        </div>

                        {role === "admin" && (
                        <div className="flex flex-wrap gap-3 mt-5">
                          <button
                            type="button"
                            onClick={() => editVendor(vendor)}
                            className="h-[42px] px-4 rounded-2xl bg-black text-white text-[13px]"
                          >
                            {vendor.phone || vendor.email ? "Edit" : "Add contact"}
                          </button>
                          {vendor.active !== false && (
                            <button
                              type="button"
                              onClick={() => deactivateVendor(vendor)}
                              disabled={saving}
                              className="h-[42px] px-4 rounded-2xl border border-black/[0.08] bg-white text-[13px] disabled:opacity-50"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}

            {filtered.length === 0 && <Panel>No vendors match the current search.</Panel>}
          </div>
        </>
      )}
    </AppShell>
  );
}

function TextField({
  label,
  value,
  required,
  onChange,
}: {
  label: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-[12px] text-zinc-500">
      {label}
      <input
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-[46px] w-full rounded-2xl border border-black/[0.08] bg-[#fafafa] px-4 text-sm outline-none"
      />
    </label>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[24px] border border-black/[0.06] bg-white p-8 mt-8 text-sm text-zinc-500">{children}</div>;
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-[24px] border border-black/[0.06] bg-white p-6">
      <p className="uppercase tracking-[0.24em] text-zinc-400 text-[10px]">{title}</p>
      <h2 className="text-[36px] font-semibold tracking-tight mt-5">{value}</h2>
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-[18px] bg-white border border-black/[0.06] p-3">
      <p className="text-zinc-400 text-[9px] uppercase tracking-[0.18em]">{title}</p>
      <p className="text-[20px] font-semibold mt-2">{value}</p>
    </div>
  );
}
