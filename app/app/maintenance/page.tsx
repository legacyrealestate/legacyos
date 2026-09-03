"use client";

import AppShell from "@/app/components/AppShell";
import { useState } from "react";

const initialForm = {
  residentName: "",
  phone: "",
  property: "",
  unit: "",
  issueCategory: "",
  issueDetails: "",
  urgency: "Medium",
  permissionToEnter: "Call first",
};

export default function MaintenancePage() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("saving");
    setMessage("");

    const res = await fetch("/api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      setStatus("error");
      setMessage(data.error || "Unable to create maintenance ticket.");
      return;
    }

    setStatus("success");
    setMessage(`Ticket ${data.data?.id || ""} created and queued for staff review.`);
    setForm(initialForm);
  }

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <AppShell>
      <div className="rounded-[24px] border border-black/[0.06] bg-white p-6 md:p-8">
        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">Resident Intake</p>
        <h1 className="text-[38px] md:text-[48px] font-semibold tracking-tight mt-4">Maintenance</h1>
        <p className="text-zinc-500 text-[15px] leading-relaxed mt-4 max-w-3xl">
          Create real maintenance tickets for staff review before any vendor notification.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
        <form onSubmit={submit} className="rounded-[24px] border border-black/[0.06] bg-white p-6 md:p-8 space-y-4">
          <Input label="Resident Name" value={form.residentName} onChange={(value) => update("residentName", value)} required />
          <Input label="Phone" value={form.phone} onChange={(value) => update("phone", value)} placeholder="+16155550123" required />
          <Input label="Property / Address" value={form.property} onChange={(value) => update("property", value)} required />
          <Input label="Unit" value={form.unit} onChange={(value) => update("unit", value)} />
          <Input label="Issue Category" value={form.issueCategory} onChange={(value) => update("issueCategory", value)} placeholder="Plumbing, HVAC, electrical, appliance..." required />
          <Textarea label="Issue Details" value={form.issueDetails} onChange={(value) => update("issueDetails", value)} required />

          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">Urgency</span>
            <select
              value={form.urgency}
              onChange={(e) => update("urgency", e.target.value)}
              className="w-full h-[52px] rounded-2xl border border-black/[0.08] bg-[#fafafa] px-4 mt-2 outline-none"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Emergency</option>
            </select>
          </label>

          <Input label="Permission to Enter" value={form.permissionToEnter} onChange={(value) => update("permissionToEnter", value)} required />

          <button disabled={status === "saving"} className="h-[52px] px-7 rounded-2xl bg-black text-white text-sm disabled:opacity-50">
            {status === "saving" ? "Creating..." : "Create Maintenance Ticket"}
          </button>

          {message && (
            <div className={`rounded-2xl p-4 text-sm ${status === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              {message}
            </div>
          )}
        </form>

        <div className="rounded-[24px] border border-black/[0.06] bg-white p-6 md:p-8">
          <p className="uppercase tracking-[0.24em] text-zinc-400 text-[10px]">Staff Review Checklist</p>
          <div className="space-y-3 mt-5">
            {[
              "Confirm urgency and safety risk.",
              "Check permission to enter and resident availability.",
              "Review matching vendors before approval.",
              "Send notifications only after human confirmation.",
              "Track resolution and resident follow-up.",
            ].map((q) => (
              <div key={q} className="rounded-2xl bg-[#fafafa] border border-black/[0.06] p-4 text-sm">
                {q}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">{label}</span>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-[52px] rounded-2xl border border-black/[0.08] bg-[#fafafa] px-4 mt-2 outline-none"
        placeholder={placeholder}
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">{label}</span>
      <textarea
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[130px] rounded-2xl border border-black/[0.08] bg-[#fafafa] p-4 mt-2 outline-none"
      />
    </label>
  );
}
