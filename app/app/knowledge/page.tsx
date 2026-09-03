"use client";

import AppShell from "@/app/components/AppShell";
import { FileText, RefreshCw, Trash2, Upload } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Source = {
  id: string;
  title: string;
  category: string;
  detected_category: string | null;
  detected_topics: string[];
  suggested_destination: string | null;
  classification_confidence: number | null;
  classification_status: "pending" | "detected" | "staff_selected" | "failed";
  original_filename: string;
  status: "queued" | "indexing" | "ready" | "failed";
  extracted_text_length: number;
  last_error: string | null;
  created_at: string;
  url: string | null;
};

const categories = ["Auto-detect", "Policies", "Maintenance", "Residents", "Owners", "Leasing", "Vendors", "Operations", "Accounting", "Legal"];

export default function KnowledgePage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [category, setCategory] = useState("Auto-detect");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/knowledge", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) setError(body.error || "Unable to load Knowledge Drop.");
    else { setSources(body.sources || []); setError(""); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = (form.elements.namedItem("file") as HTMLInputElement).files?.[0];
    if (!file) return;
    setBusy("upload"); setError(""); setNotice("");
    const data = new FormData(); data.append("file", file); data.append("category", category);
    const response = await fetch("/api/knowledge", { method: "POST", body: data });
    const body = await response.json();
    setBusy("");
    if (!response.ok) setError(body.error || "Knowledge file upload failed.");
    else { setNotice(`Indexed ${body.chunks} knowledge chunks.`); form.reset(); await load(); }
  }

  async function action(id: string, type: "reindex" | "delete") {
    setBusy(`${type}:${id}`); setError(""); setNotice("");
    const response = await fetch(`/api/knowledge/${id}`, { method: type === "delete" ? "DELETE" : "POST" });
    const body = await response.json();
    setBusy("");
    if (!response.ok) setError(body.error || `Unable to ${type} this knowledge file.`);
    else { setNotice(type === "delete" ? "Knowledge file deleted." : `Reindexed ${body.chunks} knowledge chunks.`); await load(); }
  }

  return <AppShell>
    <section className="mx-auto max-w-6xl">
      <div className="border-b border-black/[.08] pb-8">
        <p className="text-[10px] uppercase tracking-[.24em] text-zinc-400">LegacyOS Memory</p>
        <h1 className="mt-3 text-3xl font-semibold">Knowledge Drop</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">Private operating rules, property notes, vendor guidance, and SOPs that ALMA can cite in answers. Files remain private in Supabase Storage.</p>
      </div>

      <div className="mt-7 grid gap-8 lg:grid-cols-[330px_minmax(0,1fr)]">
        <form onSubmit={upload} className="border border-black/[.08] bg-white p-6">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center bg-black text-white"><Upload size={18} /></span><div><h2 className="font-semibold">Add knowledge</h2><p className="text-xs text-zinc-500">PDF, Word, Excel, text, data, or image</p></div></div>
          <label className="mt-6 block text-xs font-medium text-zinc-700">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 h-11 w-full border border-black/[.12] bg-white px-3 text-sm">{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="mt-5 block text-xs font-medium text-zinc-700">File<input name="file" type="file" accept=".pdf,.docx,.xlsx,.txt,.md,.markdown,.csv,.json,.jpg,.jpeg,.png,.webp" className="mt-2 block w-full border border-dashed border-black/[.18] p-3 text-xs" /></label>
          <button disabled={busy === "upload"} className="mt-5 h-11 w-full bg-black text-sm text-white disabled:opacity-50">{busy === "upload" ? "Uploading and indexing..." : "Upload and index"}</button>
          <p className="mt-4 text-xs leading-5 text-zinc-500">ALMA indexes the file, detects a category and topics, and suggests a review lane. This never changes a vendor, contact, or ticket without staff approval. Files remain private.</p>
        </form>

        <div>
          <div className="flex items-center justify-between gap-4"><h2 className="font-semibold">Indexed sources</h2><span className="text-xs text-zinc-500">{sources.length} files</span></div>
          {error && <p className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {notice && <p className="mt-4 border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
          <div className="mt-4 divide-y divide-black/[.07] border-y border-black/[.08] bg-white">
            {sources.length === 0 && <p className="p-6 text-sm text-zinc-500">No knowledge files have been added.</p>}
            {sources.map((source) => <article key={source.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><FileText size={16} className="shrink-0 text-zinc-500" /><p className="truncate font-medium">{source.title}</p><Status value={source.status} /></div><p className="mt-1 text-xs text-zinc-500">{source.category} · {source.original_filename} · {source.extracted_text_length.toLocaleString()} extracted characters</p>{source.status === "ready" && <p className="mt-2 text-xs text-zinc-600">Detected: {source.detected_category || source.category}{source.detected_topics?.length ? ` · ${source.detected_topics.join(", ")}` : ""}{source.suggested_destination ? ` · Review: ${source.suggested_destination}` : ""}</p>}{source.last_error && <p className="mt-2 text-xs text-red-700">{source.last_error}</p>}</div><div className="flex shrink-0 items-center gap-2">{source.url && <a href={source.url} target="_blank" rel="noreferrer" className="border border-black/[.12] px-3 py-2 text-xs">View</a>}<button aria-label={`Reindex ${source.title}`} onClick={() => action(source.id, "reindex")} disabled={Boolean(busy)} className="border border-black/[.12] p-2 disabled:opacity-40"><RefreshCw size={15} /></button><button aria-label={`Delete ${source.title}`} onClick={() => action(source.id, "delete")} disabled={Boolean(busy)} className="border border-red-200 p-2 text-red-700 disabled:opacity-40"><Trash2 size={15} /></button></div></article>)}
          </div>
        </div>
      </div>
    </section>
  </AppShell>;
}

function Status({ value }: { value: Source["status"] }) {
  const style = value === "ready" ? "bg-emerald-50 text-emerald-700" : value === "failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800";
  return <span className={`px-2 py-1 text-[9px] uppercase tracking-wide ${style}`}>{value}</span>;
}
