import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { getCurrentUserId } from "@/lib/auth";

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

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.promises.mkdir(uploadsDir, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const filename = `${Date.now()}-${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filepath = path.join(uploadsDir, filename);
  await fs.promises.writeFile(filepath, buffer);

  const att = await prisma.attachment.create({
    data: {
      taskId: task.id,
      filePath: `/uploads/${filename}`,
      originalFilename: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: buffer.length,
    },
  });

  return NextResponse.json(att);
}
