"use client";

import AppShell from "@/app/components/AppShell";
import { Building2, Mail, Phone, Plus, Search, UserRound, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Contact = { id: string; contact_type: string; full_name: string; email?: string | null; phone?: string | null; property_label?: string | null; unit?: string | null; status: string; last_contact_at?: string | null; tags?: string[] };

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() { const response = await fetch("/api/crm/contacts"); const data = await response.json(); if (!response.ok) setError(data.error || "Unable to load contacts."); else setContacts(data); setLoading(false); }
  useEffect(() => {
    let cancelled = false;
    async function loadInitialContacts() {
      const response = await fetch("/api/crm/contacts");
      const data = await response.json();
      if (cancelled) return;
      if (!response.ok) setError(data.error || "Unable to load contacts.");
      else setContacts(data);
      setLoading(false);
    }
    loadInitialContacts();
    return () => { cancelled = true; };
  }, []);
  const filtered = useMemo(() => { const value = query.toLowerCase(); return contacts.filter((contact) => [contact.full_name, contact.email, contact.phone, contact.property_label].filter(Boolean).some((field) => String(field).toLowerCase().includes(value))); }, [contacts, query]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/crm/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactType: form.get("contactType"), fullName: form.get("fullName"), email: form.get("email"), phone: form.get("phone"), propertyLabel: form.get("propertyLabel"), unit: form.get("unit"), status: form.get("status"), notes: form.get("notes") }) });
    const data = await response.json();
    if (!response.ok) setError(data.error || "Unable to create contact."); else { event.currentTarget.reset(); setFormOpen(false); await load(); }
    setSaving(false);
  }

  return <AppShell><section className="rounded-[28px] border border-black/[0.06] bg-white p-6 md:p-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-[10px] uppercase tracking-[0.24em] text-emerald-700">Relationship CRM</p><h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">People, not scattered records.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-500">Residents, owners, leads, and vendors automatically connected to calls, properties, and communication history.</p></div><button onClick={() => setFormOpen(true)} className="flex h-12 items-center gap-2 rounded-2xl bg-black px-5 text-sm text-white"><Plus size={17} /> Add contact</button></div></section>
    {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <section className="mt-5 rounded-[26px] border border-black/[0.06] bg-white p-4 md:p-6"><label className="flex h-12 items-center gap-3 rounded-2xl bg-zinc-50 px-4"><Search size={17} className="text-zinc-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search contacts, phone, email, or property" className="w-full bg-transparent text-sm outline-none" /></label><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{loading && <p className="text-sm text-zinc-500">Loading CRM…</p>}{!loading && filtered.length === 0 && <p className="text-sm text-zinc-500">No contacts found.</p>}{filtered.map((contact) => <article key={contact.id} className="rounded-[22px] border border-black/[0.06] p-5"><div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><UserRound size={19} /></span><span className="rounded-full bg-zinc-100 px-3 py-1 text-[9px] uppercase tracking-[0.12em]">{contact.contact_type}</span></div><h2 className="mt-5 text-lg font-semibold">{contact.full_name}</h2><div className="mt-4 space-y-2 text-xs text-zinc-500">{contact.phone && <p className="flex items-center gap-2"><Phone size={14} />{contact.phone}</p>}{contact.email && <p className="flex items-center gap-2"><Mail size={14} />{contact.email}</p>}{contact.property_label && <p className="flex items-center gap-2"><Building2 size={14} />{contact.property_label}{contact.unit ? ` · ${contact.unit}` : ""}</p>}</div><div className="mt-5 flex items-center justify-between border-t border-black/[0.05] pt-4 text-[10px] text-zinc-400"><span>{contact.status}</span><span>{contact.last_contact_at ? `Contacted ${new Date(contact.last_contact_at).toLocaleDateString()}` : "No activity yet"}</span></div></article>)}</div></section>
    {formOpen && <div className="fixed inset-0 z-[500] grid place-items-center bg-black/35 p-4 backdrop-blur-sm"><form onSubmit={create} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl md:p-8"><div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">CRM record</p><h2 className="mt-2 text-2xl font-semibold">Add contact</h2></div><button type="button" onClick={() => setFormOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-zinc-100"><X size={18} /></button></div><div className="mt-6 grid gap-4 md:grid-cols-2"><Field name="fullName" label="Full name" required /><Field name="phone" label="Phone (E.164)" placeholder="+16155550123" /><Field name="email" label="Email" type="email" /><Field name="propertyLabel" label="Property" /><Field name="unit" label="Unit" /><Select name="contactType" label="Contact type" options={["Resident", "Owner", "Lead", "Vendor", "Other"]} /><Select name="status" label="Status" options={["Active", "Lead", "Inactive"]} /></div><label className="mt-4 block text-xs text-zinc-500">Notes<textarea name="notes" className="mt-2 min-h-24 w-full rounded-2xl border border-black/[0.08] p-4 text-sm" /></label><button disabled={saving} className="mt-6 h-12 w-full rounded-2xl bg-black text-sm text-white disabled:opacity-40">{saving ? "Saving…" : "Create contact"}</button></form></div>}
    </AppShell>;
}
function Field({ name, label, required = false, type = "text", placeholder }: { name: string; label: string; required?: boolean; type?: string; placeholder?: string }) { return <label className="text-xs text-zinc-500">{label}<input name={name} required={required} type={type} placeholder={placeholder} className="mt-2 h-12 w-full rounded-2xl border border-black/[0.08] px-4 text-sm" /></label>; }
function Select({ name, label, options }: { name: string; label: string; options: string[] }) { return <label className="text-xs text-zinc-500">{label}<select name={name} className="mt-2 h-12 w-full rounded-2xl border border-black/[0.08] px-4 text-sm">{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
