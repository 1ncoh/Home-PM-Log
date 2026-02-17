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

function createStorageClient() {
  const config = getStorageConfig();
  if (!config) return null;

  const supabase = createClient(config.url, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return { supabase, bucket: config.bucket, url: config.url };
}

function parseSupabaseRef(storedPath: string) {
  if (!storedPath.startsWith("supabase://")) return null;
  const raw = storedPath.replace("supabase://", "");
  const slashIndex = raw.indexOf("/");
  if (slashIndex <= 0) return null;
  const bucket = raw.slice(0, slashIndex);
  const objectPath = raw.slice(slashIndex + 1);
  if (!objectPath) return null;
  return { bucket, objectPath };
}

function parseSupabasePublicUrl(storedPath: string) {
  const marker = "/storage/v1/object/public/";
  const markerIndex = storedPath.indexOf(marker);
  if (markerIndex < 0) return null;

  const tail = storedPath.slice(markerIndex + marker.length);
  const slashIndex = tail.indexOf("/");
  if (slashIndex <= 0) return null;

  const bucket = decodeURIComponent(tail.slice(0, slashIndex));
  const objectPath = tail.slice(slashIndex + 1);
  if (!objectPath) return null;
  return { bucket, objectPath };
}

export async function resolveStoredFileUrl(storedPath: string) {
  const fromRef = parseSupabaseRef(storedPath);
  const fromPublicUrl = parseSupabasePublicUrl(storedPath);
  const parsed = fromRef ?? fromPublicUrl;
  if (!parsed) return storedPath;

  const client = createStorageClient();
  if (!client) return storedPath;

  const { data, error } = await client.supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.objectPath, 60 * 60 * 24 * 7);
  if (error || !data?.signedUrl) return storedPath;
  return data.signedUrl;
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

  const client = createStorageClient();
  if (client) {
    const objectPath = `${userId}/${folder}/${filename}`;
    const { error } = await client.supabase.storage
      .from(client.bucket)
      .upload(objectPath, buffer, { contentType, upsert: false });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    return {
      path: `supabase://${client.bucket}/${objectPath}`,
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
