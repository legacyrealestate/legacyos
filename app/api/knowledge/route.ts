import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireAdmin, requireUser } from "@/lib/security/auth";
import { safeFilename } from "@/lib/security/validation";
import { indexKnowledgeSource, isKnowledgeFileType, knowledgeMimeType, KNOWLEDGE_BUCKET } from "@/lib/knowledge";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function GET() {
  try {
    await requireUser();
    const db = createServiceSupabaseClient();
    const { data, error } = await db.from("knowledge_sources").select("*").order("created_at", { ascending: false });
    if (error) throw new ApiError(error.code === "42P01" ? "missing_migration" : "server_error", "Knowledge Drop is not available.");
    const sources = await Promise.all((data || []).map(async (source) => {
      const signed = await db.storage.from(KNOWLEDGE_BUCKET).createSignedUrl(source.storage_path, 10 * 60);
      return { ...source, url: signed.data?.signedUrl || null };
    }));
    return apiJson({ sources });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    const form = await req.formData();
    const file = form.get("file");
    const rawCategory = form.get("category");
    if (!(file instanceof File)) throw new ApiError("bad_request", "Choose a knowledge file to upload.");
    if (file.size > MAX_FILE_SIZE) throw new ApiError("bad_request", "Knowledge files are limited to 10 MB.");
    if (!isKnowledgeFileType(file)) throw new ApiError("bad_request", "Use a PDF, DOCX, XLSX, TXT, Markdown, CSV, JSON, JPG, PNG, or WebP file.");
    const category = typeof rawCategory === "string" && rawCategory.trim() ? rawCategory.trim().slice(0, 80) : "Auto-detect";
    const cleanName = safeFilename(file.name);
    const storagePath = `uploads/${crypto.randomUUID()}-${cleanName}`;
    const db = createServiceSupabaseClient();
    const mimeType = knowledgeMimeType(file);
    const uploaded = await db.storage.from(KNOWLEDGE_BUCKET).upload(storagePath, file, { contentType: mimeType, upsert: false });
    if (uploaded.error) throw new ApiError("server_error", uploaded.error.message);
    const { data: source, error } = await db.from("knowledge_sources").insert({
      title: cleanName.replace(/\.[^.]+$/, ""), category, storage_path: storagePath, original_filename: cleanName,
      mime_type: mimeType, byte_size: file.size, created_by: auth.user.id,
    }).select("id").single();
    if (error || !source) {
      await db.storage.from(KNOWLEDGE_BUCKET).remove([storagePath]);
      throw new ApiError("server_error", "Unable to create the knowledge source.");
    }
    await db.from("knowledge_ingestion_jobs").insert({ source_id: source.id, created_by: auth.user.id });
    const indexed = await indexKnowledgeSource(source.id);
    return apiJson({ success: true, sourceId: source.id, ...indexed }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
