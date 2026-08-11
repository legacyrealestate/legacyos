import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { chunkKnowledgeText, isKnowledgeFileType } from "../lib/knowledge-text.ts";

test("Knowledge Drop accepts text-bearing files and leaves image OCR disabled", () => {
  assert.equal(isKnowledgeFileType(new File(["policy"], "rules.txt", { type: "text/plain" })), true);
  assert.equal(isKnowledgeFileType(new File(["policy"], "rules.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })), true);
  assert.equal(isKnowledgeFileType(new File(["image"], "photo.png", { type: "image/png" })), false);
});

test("Knowledge Drop chunks readable text with overlap", () => {
  const value = Array.from({ length: 300 }, (_, index) => `Rule ${index}: contact staff before making a commitment.`).join("\n");
  const chunks = chunkKnowledgeText(value);
  assert.ok(chunks.length > 1);
  assert.match(chunks[0], /Rule 0/);
  assert.match(chunks.at(-1) || "", /Rule 299/);
});

test("Knowledge migration creates private RLS-protected pgvector retrieval", () => {
  const migration = fs.readFileSync("supabase/migrations/202608110001_knowledge_drop_rag.sql", "utf8");
  for (const value of ["legacy-knowledge", "knowledge_sources", "knowledge_chunks", "knowledge_ingestion_jobs", "match_knowledge_chunks", "enable row level security"]) {
    assert.match(migration, new RegExp(value));
  }
  assert.match(migration, /vector\(1536\)/);
  assert.match(migration, /revoke all on public\.knowledge_sources, public\.knowledge_ingestion_jobs from anon, authenticated/i);
  assert.match(migration, /revoke all on public\.knowledge_chunks from anon, authenticated/i);
  assert.match(migration, /security invoker/i);
});

test("Knowledge routes are admin-write, staff-read, and ALMA returns citations", () => {
  const rootRoute = fs.readFileSync("app/api/knowledge/route.ts", "utf8");
  const detailRoute = fs.readFileSync("app/api/knowledge/[id]/route.ts", "utf8");
  const chatRoute = fs.readFileSync("app/api/alma/chat/route.ts", "utf8");
  assert.match(rootRoute, /await requireUser\(\)/);
  assert.match(rootRoute, /await requireAdmin\(\)/);
  assert.match(detailRoute, /await requireAdmin\(\)/);
  assert.match(chatRoute, /retrieveKnowledge\(message\)/);
  assert.match(chatRoute, /citations/);
});
