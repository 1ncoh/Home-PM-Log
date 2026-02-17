import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getStorageConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!url || !serviceRoleKey || !bucket) return null;
  return { url, serviceRoleKey, bucket };
}

export async function storeImage({
  file,
  userId,
  folder,
}: {
  file: File;
  userId: string;
  folder: "completions" | "attachments";
}) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const originalFilename = file.name;
  const filename = `${Date.now()}-${randomUUID()}-${sanitizeFilename(originalFilename)}`;
  const contentType = file.type || "application/octet-stream";

  const config = getStorageConfig();
  if (config) {
    const supabase = createClient(config.url, config.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const objectPath = `${userId}/${folder}/${filename}`;
    const { error } = await supabase.storage
      .from(config.bucket)
      .upload(objectPath, buffer, { contentType, upsert: false });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    const { data } = supabase.storage.from(config.bucket).getPublicUrl(objectPath);
    return {
      path: data.publicUrl,
      originalFilename,
      mimeType: contentType,
      sizeBytes: buffer.length,
    };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Supabase Storage is not configured. Set SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET.",
    );
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.promises.mkdir(uploadsDir, { recursive: true });
  const fullPath = path.join(uploadsDir, filename);
  await fs.promises.writeFile(fullPath, buffer);

  return {
    path: `/uploads/${filename}`,
    originalFilename,
    mimeType: contentType,
    sizeBytes: buffer.length,
  };
}
