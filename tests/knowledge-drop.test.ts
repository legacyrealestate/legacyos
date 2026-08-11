import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { strToU8, zipSync } from "fflate";
import { extractSpreadsheetText } from "../lib/knowledge-spreadsheet.ts";
import { chunkKnowledgeText, classifyKnowledgeText, isKnowledgeFileType } from "../lib/knowledge-text.ts";

test("Knowledge Drop accepts text-bearing, spreadsheet, and image files", () => {
  assert.equal(isKnowledgeFileType(new File(["policy"], "rules.txt", { type: "text/plain" })), true);
  assert.equal(isKnowledgeFileType(new File(["policy"], "rules.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })), true);
  assert.equal(isKnowledgeFileType(new File(["sheet"], "vendors.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })), true);
  assert.equal(isKnowledgeFileType(new File(["image"], "photo.png", { type: "image/png" })), true);
});

test("Knowledge Drop classification recommends a review lane without changing CRM data", () => {
  const result = classifyKnowledgeText("After-hours plumbing guidance", "For a water leak, create a maintenance work order and contact the on-call plumber.");
  assert.equal(result.category, "Maintenance");
  assert.equal(result.suggestedDestination, "Maintenance review queue");
  assert.ok(result.topics.includes("maintenance"));
});

test("Knowledge Drop extracts shared strings from an XLSX workbook", () => {
  const workbook = Buffer.from(zipSync({
    "xl/sharedStrings.xml": strToU8('<sst><si><t>Vendor Name</t></si><si><t>Legacy Plumbing</t></si></sst>'),
    "xl/worksheets/sheet1.xml": strToU8('<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row><row r="2"><c r="A2" t="s"><v>1</v></c></row></sheetData></worksheet>'),
  }));
  const text = extractSpreadsheetText(workbook);
  assert.match(text, /Vendor Name/);
  assert.match(text, /Legacy Plumbing/);
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
  const expansion = fs.readFileSync("supabase/migrations/20260811141200_expand_knowledge_ingestion_and_alma_grounding.sql", "utf8");
  for (const value of ["detected_category", "suggested_destination", "image/png", "spreadsheetml.sheet", "reload schema"]) assert.match(expansion, new RegExp(value));
});

test("Knowledge routes are admin-write, staff-read, and ALMA returns citations", () => {
  const rootRoute = fs.readFileSync("app/api/knowledge/route.ts", "utf8");
  const detailRoute = fs.readFileSync("app/api/knowledge/[id]/route.ts", "utf8");
  const chatRoute = fs.readFileSync("app/api/alma/chat/route.ts", "utf8");
  assert.match(rootRoute, /await requireUser\(\)/);
  assert.match(rootRoute, /await requireAdmin\(\)/);
  assert.match(detailRoute, /await requireAdmin\(\)/);
  assert.match(chatRoute, /retrieveKnowledge\(message, 8\)/);
  assert.match(chatRoute, /citations/);
  assert.match(chatRoute, /body_text/);
  assert.match(chatRoute, /transcript/);
  assert.match(rootRoute, /knowledgeMimeType/);
  assert.match(fs.readFileSync("lib/knowledge.ts", "utf8"), /type: "input_file"/);
});
