import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = "legacy-documents";

async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) {
    await supabase.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 52428800,
    });
  }
}

export async function GET() {
  await ensureBucket();

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

  const documents: any[] = [];

  for (const category of categories) {
    const { data } = await supabase.storage.from(BUCKET).list(category);

    if (data) {
      for (const file of data) {
        if (!file.name.includes(".")) continue;

        const path = `${category}/${file.name}`;

        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(path, 60 * 60);

        documents.push({
          name: file.name,
          category,
          path,
          size: file.metadata?.size || 0,
          updated_at: file.updated_at,
          url: signed?.signedUrl || null,
        });
      }
    }
  }

  return NextResponse.json({ success: true, documents });
}

export async function POST(req: Request) {
  await ensureBucket();

  const formData = await req.formData();

  const file = formData.get("file") as File | null;
  const category = String(formData.get("category") || "Residents");

  if (!file) {
    return NextResponse.json(
      { success: false, error: "No file uploaded." },
      { status: 400 }
    );
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${category}/${Date.now()}-${cleanName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/pdf",
    upsert: false,
  });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  await supabase.from("operations_feed").insert({
    type: "document",
    title: "Document Uploaded",
    description: `${file.name} uploaded to ${category}`,
  });

  return NextResponse.json({
    success: true,
    path,
  });
}
