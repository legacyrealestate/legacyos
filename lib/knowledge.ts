import "server-only";

import mammoth from "mammoth";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
import { ApiError } from "@/lib/security/api";
import { chunkKnowledgeText } from "@/lib/knowledge-text";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const KNOWLEDGE_BUCKET = "legacy-knowledge";
const EMBEDDING_MODEL = "text-embedding-3-small";

export type KnowledgeCitation = {
  type: "knowledge";
  sourceId: string;
  label: string;
  excerpt: string;
  similarity: number;
};

function openAI() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new ApiError("service_unavailable", "OPENAI_API_KEY is not configured.");
  return new OpenAI({ apiKey });
}

function normalizeText(value: string) {
  return value.replace(/\u0000/g, "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function extractText(file: { name: string; type: string; data: Buffer }) {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    const parser = new PDFParse({ data: file.data });
    try {
      return normalizeText((await parser.getText()).text);
    } finally {
      await parser.destroy();
    }
  }
  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || /\.docx$/i.test(file.name)) {
    return normalizeText((await mammoth.extractRawText({ buffer: file.data })).value);
  }
  if (/^image\//.test(file.type)) {
    throw new ApiError("bad_request", "Image knowledge upload needs OCR, which is not configured yet.");
  }
  return normalizeText(file.data.toString("utf8"));
}

async function embed(values: string[]) {
  const response = await openAI().embeddings.create({ model: EMBEDDING_MODEL, input: values });
  return response.data.map((item) => item.embedding);
}

export async function indexKnowledgeSource(sourceId: string) {
  const db = createServiceSupabaseClient();
  const { data: source, error } = await db
    .from("knowledge_sources")
    .select("id,title,original_filename,mime_type,storage_path")
    .eq("id", sourceId)
    .single();
  if (error || !source) throw new ApiError("not_found", "Knowledge source not found.");
  await db.from("knowledge_sources").update({ status: "indexing", last_error: null, updated_at: new Date().toISOString() }).eq("id", sourceId);
  await db.from("knowledge_ingestion_jobs").update({ status: "running", attempts: 1, last_error: null, updated_at: new Date().toISOString() }).eq("source_id", sourceId).in("status", ["queued", "failed"]);

  try {
    const downloaded = await db.storage.from(KNOWLEDGE_BUCKET).download(source.storage_path);
    if (downloaded.error || !downloaded.data) throw new ApiError("server_error", downloaded.error?.message || "Unable to read the private source file.");
    const text = await extractText({ name: source.original_filename, type: source.mime_type, data: Buffer.from(await downloaded.data.arrayBuffer()) });
    const chunks = chunkKnowledgeText(text);
    if (!chunks.length) throw new ApiError("bad_request", "No readable text was found in this file.");

    const { error: deleteError } = await db.from("knowledge_chunks").delete().eq("source_id", sourceId);
    if (deleteError) throw new ApiError("server_error", "Unable to replace prior knowledge chunks.");
    for (let index = 0; index < chunks.length; index += 40) {
      const batch = chunks.slice(index, index + 40);
      const vectors = await embed(batch);
      const { error: insertError } = await db.from("knowledge_chunks").insert(batch.map((content, batchIndex) => ({
        source_id: sourceId,
        chunk_index: index + batchIndex,
        content,
        embedding: vectors[batchIndex],
      })));
      if (insertError) throw new ApiError("server_error", "Unable to store knowledge embeddings.");
    }
    const timestamp = new Date().toISOString();
    await Promise.all([
      db.from("knowledge_sources").update({ status: "ready", extracted_text_length: text.length, indexed_at: timestamp, last_error: null, updated_at: timestamp }).eq("id", sourceId),
      db.from("knowledge_ingestion_jobs").update({ status: "completed", last_error: null, updated_at: timestamp }).eq("source_id", sourceId).eq("status", "running"),
    ]);
    return { chunks: chunks.length, textLength: text.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Knowledge indexing failed.";
    await Promise.all([
      db.from("knowledge_sources").update({ status: "failed", last_error: message, updated_at: new Date().toISOString() }).eq("id", sourceId),
      db.from("knowledge_ingestion_jobs").update({ status: "failed", last_error: message, updated_at: new Date().toISOString() }).eq("source_id", sourceId).eq("status", "running"),
    ]);
    throw error;
  }
}

export async function retrieveKnowledge(query: string, count = 6): Promise<KnowledgeCitation[]> {
  const embedding = (await embed([query.slice(0, 6000)]))[0];
  const { data, error } = await createServiceSupabaseClient().rpc("match_knowledge_chunks", {
    query_embedding: embedding,
    match_count: count,
  });
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST202") return [];
    throw new ApiError("server_error", "Knowledge retrieval failed.");
  }
  return (data || []).map((item: { source_id: string; source_title: string; original_filename: string; content: string; similarity: number }) => ({
    type: "knowledge",
    sourceId: item.source_id,
    label: `Knowledge file: ${item.source_title || item.original_filename}`,
    excerpt: item.content.slice(0, 340),
    similarity: Number(item.similarity || 0),
  }));
}

export { KNOWLEDGE_BUCKET };
export { chunkKnowledgeText, isKnowledgeFileType } from "@/lib/knowledge-text";
