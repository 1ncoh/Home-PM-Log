import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { storeImage } from "@/lib/storage";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const taskId = form.get("taskId") as string | null;

  if (!file || !taskId) {
    return NextResponse.json({ error: "file and taskId required" }, { status: 400 });
  }

  const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  let stored: {
    path: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
  };
  try {
    stored = await storeImage({ file, userId, folder: "attachments" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "File upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const att = await prisma.attachment.create({
    data: {
      taskId: task.id,
      filePath: stored.path,
      originalFilename: stored.originalFilename,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
    },
  });

  return NextResponse.json(att);
}
