"use client";

import AppShell from "@/app/components/AppShell";
import { Building2, MapPin, Plus, Users, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type Property = { id: string; name: string; address: string; city?: string | null; state?: string | null; postal_code?: string | null; units: number; status: string; crm_contacts?: Array<{ count: number }> };

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function load() { const response = await fetch("/api/crm/properties"); const data = await response.json(); if (!response.ok) setError(data.error || "Unable to load properties."); else setProperties(data); }
  useEffect(() => {
    let cancelled = false;
    async function loadInitialProperties() {
      const response = await fetch("/api/crm/properties");
      const data = await response.json();
      if (cancelled) return;
      if (!response.ok) setError(data.error || "Unable to load properties.");
      else setProperties(data);
    }
    loadInitialProperties();
    return () => { cancelled = true; };
  }, []);
  async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); const form = new FormData(event.currentTarget); const response = await fetch("/api/crm/properties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), address: form.get("address"), city: form.get("city"), state: form.get("state"), postalCode: form.get("postalCode"), units: Number(form.get("units")), status: form.get("status"), notes: form.get("notes") }) }); const data = await response.json(); if (!response.ok) setError(data.error || "Unable to create property."); else { event.currentTarget.reset(); setOpen(false); await load(); } setSaving(false); }
  const totalUnits = properties.reduce((sum, property) => sum + property.units, 0);
  return <AppShell><section className="rounded-[28px] bg-[#0b0e0c] p-6 text-white md:p-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-[10px] uppercase tracking-[0.24em] text-emerald-300">Property CRM</p><h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">The portfolio, connected.</h1><p className="mt-4 text-sm text-zinc-400">{properties.length} properties · {totalUnits} units</p></div><button onClick={() => setOpen(true)} className="flex h-12 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-medium text-black"><Plus size={17} /> Add property</button></div></section>{error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}<section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{properties.length === 0 && <div className="rounded-[24px] border border-black/[0.06] bg-white p-6 text-sm text-zinc-500">No properties added yet.</div>}{properties.map((property) => <article key={property.id} className="rounded-[24px] border border-black/[0.06] bg-white p-6"><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Building2 size={21} /></span><span className="rounded-full bg-zinc-100 px-3 py-1 text-[9px] uppercase tracking-[0.14em]">{property.status}</span></div><h2 className="mt-5 text-xl font-semibold">{property.name}</h2><p className="mt-3 flex items-start gap-2 text-sm leading-6 text-zinc-500"><MapPin size={16} className="mt-1 shrink-0" />{property.address}{property.city ? `, ${property.city}` : ""}{property.state ? `, ${property.state}` : ""}</p><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-zinc-50 p-4"><p className="text-[9px] uppercase tracking-[0.16em] text-zinc-400">Units</p><p className="mt-2 text-xl font-semibold">{property.units}</p></div><div className="rounded-2xl bg-zinc-50 p-4"><p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] text-zinc-400"><Users size={11} /> Contacts</p><p className="mt-2 text-xl font-semibold">{property.crm_contacts?.[0]?.count || 0}</p></div></div></article>)}</section>{open && <div className="fixed inset-0 z-[500] grid place-items-center bg-black/35 p-4 backdrop-blur-sm"><form onSubmit={create} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl md:p-8"><div className="flex items-center justify-between"><h2 className="text-2xl font-semibold">Add property</h2><button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-zinc-100"><X size={18} /></button></div><div className="mt-6 grid gap-4 md:grid-cols-2"><Field name="name" label="Property name" required /><Field name="address" label="Street address" required /><Field name="city" label="City" /><Field name="state" label="State" /><Field name="postalCode" label="Postal code" /><Field name="units" label="Units" type="number" required /><label className="text-xs text-zinc-500">Status<select name="status" className="mt-2 h-12 w-full rounded-2xl border border-black/[0.08] px-4 text-sm"><option>Active</option><option>Onboarding</option><option>Inactive</option></select></label></div><label className="mt-4 block text-xs text-zinc-500">Notes<textarea name="notes" className="mt-2 min-h-24 w-full rounded-2xl border border-black/[0.08] p-4 text-sm" /></label><button disabled={saving} className="mt-6 h-12 w-full rounded-2xl bg-black text-sm text-white disabled:opacity-40">{saving ? "Saving…" : "Create property"}</button></form></div>}</AppShell>;
}
function Field({ name, label, required = false, type = "text" }: { name: string; label: string; required?: boolean; type?: string }) { return <label className="text-xs text-zinc-500">{label}<input name={name} required={required} type={type} min={type === "number" ? 0 : undefined} className="mt-2 h-12 w-full rounded-2xl border border-black/[0.08] px-4 text-sm" /></label>; }
