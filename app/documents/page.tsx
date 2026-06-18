"use client";

import AppShell from "@/app/components/AppShell";
import { useEffect, useMemo, useState } from "react";

const categories = [
  "Leasing",
  "Residents",
  "Owners",
  "Maintenance",
  "HOA",
  "Policies",
  "Accounting",
  "Legal",
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [category, setCategory] = useState("Residents");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  async function loadDocuments() {
    const res = await fetch("/api/documents");
    const data = await res.json();
    setDocuments(data.documents || []);
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  async function uploadFile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;

    if (!fileInput.files?.[0]) return;

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("category", category);

    setUploading(true);

    await fetch("/api/documents", {
      method: "POST",
      body: formData,
    });

    setUploading(false);
    form.reset();
    loadDocuments();
  }

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      const text = `${doc.name} ${doc.category}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [documents, search]);

  return (
    <AppShell>
      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">
        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">
          LegacyOS Document Vault
        </p>
        <h1 className="text-[44px] md:text-[58px] font-semibold tracking-tight mt-5">
          Document Library
        </h1>
        <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
          Upload, organize, search, view, and download Legacy Nashville documents for leasing, residents, owners, maintenance, HOA, policies, accounting, and legal workflows.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6 mt-8">
        <form onSubmit={uploadFile} className="rounded-[34px] border border-black/[0.06] bg-white p-8">
          <h2 className="text-2xl font-semibold">Upload Document</h2>

          <label className="block mt-6">
            <span className="text-xs uppercase tracking-[0.22em] text-zinc-400">Category</span>
            <select
              className="mt-2 h-[52px] w-full rounded-2xl border border-black/[0.08] bg-[#fafafa] px-4"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="block mt-5">
            <span className="text-xs uppercase tracking-[0.22em] text-zinc-400">PDF / Document</span>
            <input
              name="file"
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              className="mt-2 block w-full rounded-2xl border border-black/[0.08] bg-[#fafafa] p-4 text-sm"
            />
          </label>

          <button
            disabled={uploading}
            className="mt-6 h-[52px] w-full rounded-2xl bg-black text-white text-sm disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload to Vault"}
          </button>
        </form>

        <div className="rounded-[34px] border border-black/[0.06] bg-white p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold">Stored Documents</h2>
            <input
              placeholder="Search documents..."
              className="h-[48px] rounded-2xl border border-black/[0.08] bg-[#fafafa] px-4 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-4 mt-6">
            {filtered.length === 0 && (
              <div className="rounded-2xl bg-[#fafafa] border border-black/[0.06] p-5 text-sm text-zinc-500">
                No documents uploaded yet.
              </div>
            )}

            {filtered.map((doc) => (
              <div key={doc.path} className="rounded-2xl bg-[#fafafa] border border-black/[0.06] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-zinc-900">{doc.name}</p>
                  <p className="text-sm text-zinc-500 mt-1">{doc.category}</p>
                </div>

                <div className="flex gap-3">
                  {doc.url && (
                    <>
                      <a
                        href={doc.url}
                        target="_blank"
                        className="h-[42px] px-4 rounded-xl bg-black text-white text-sm flex items-center"
                      >
                        View
                      </a>
                      <a
                        href={doc.url}
                        download
                        className="h-[42px] px-4 rounded-xl border border-black/[0.08] bg-white text-sm flex items-center"
                      >
                        Download
                      </a>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
