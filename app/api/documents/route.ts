import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import {
  DOCUMENT_CATEGORIES,
  assertOneOf,
  isAllowedDocumentType,
  safeFilename,
} from "@/lib/security/validation";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const BUCKET = "legacy-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type DocumentListItem = {
  name: string;
  category: string;
  path: string;
  size: number;
  updated_at: string | null;
  url: string;
};

export async function GET() {
  try {
    await requireUser();
    const supabase = createServiceSupabaseClient();
    const documents: DocumentListItem[] = [];

    for (const category of DOCUMENT_CATEGORIES) {
      const { data, error } = await supabase.storage.from(BUCKET).list(category);
      if (error) throw new ApiError("server_error", error.message);

      for (const file of data || []) {
        if (!file.name.includes(".")) continue;
        const path = `${category}/${file.name}`;
        const { data: signed, error: signedError } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(path, 10 * 60);

        if (signedError || !signed?.signedUrl) {
          throw new ApiError("server_error", signedError?.message || "Unable to sign document URL.");
        }

        documents.push({
          name: file.name,
          category,
          path,
          size: Number(file.metadata?.size || 0),
          updated_at: file.updated_at,
          url: signed.signedUrl,
        });
      }
    }

    return apiJson({ success: true, documents });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    const supabase = createServiceSupabaseClient();
    const formData = await req.formData();

    const file = formData.get("file");
    const category = assertOneOf(formData.get("category"), DOCUMENT_CATEGORIES, "document category");

    if (!(file instanceof File)) throw new ApiError("bad_request", "No file uploaded.");
    if (file.size > MAX_FILE_SIZE) throw new ApiError("bad_request", "File exceeds 10 MB limit.");
    if (!isAllowedDocumentType(file)) throw new ApiError("bad_request", "Unsupported document type.");

    const cleanName = safeFilename(file.name);
    const path = `${category}/${crypto.randomUUID()}-${cleanName}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (error) throw new ApiError("server_error", error.message);

    const { error: feedError } = await supabase.from("operations_feed").insert({
      type: "document",
      title: "Document Uploaded",
      description: `${cleanName} uploaded to ${category}`,
      created_by: auth.user.id,
    });

    if (feedError) throw new ApiError("server_error", feedError.message);

    return apiJson({ success: true, path });
  } catch (error) {
    return apiError(error);
  }
}
