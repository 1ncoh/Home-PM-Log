import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeNextDue } from "@/lib/dates";
import { getCurrentUserId } from "@/lib/auth";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const task = await prisma.task.findFirst({ where: { id, userId } });
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  const form = await req.formData();
  const notesRaw = form.get("notes");
  const image = form.get("image") as File | null;
  const notes = typeof notesRaw === "string" ? notesRaw.trim() : null;

  let imageData:
    | {
        imagePath: string;
        imageFilename: string;
        imageMimeType: string;
        imageSizeBytes: number;
      }
    | undefined;

  if (image && image.size > 0) {
    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image uploads are supported for sign-off." },
        { status: 400 },
      );
    }

    if (image.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image size exceeds 10MB limit." },
        { status: 400 },
      );
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.promises.mkdir(uploadsDir, { recursive: true });

    const filename = `${Date.now()}-${randomUUID()}-${sanitizeFilename(image.name)}`;
    const fullPath = path.join(uploadsDir, filename);
    const bytes = await image.arrayBuffer();
    await fs.promises.writeFile(fullPath, Buffer.from(bytes));

    imageData = {
      imagePath: `/uploads/${filename}`,
      imageFilename: image.name,
      imageMimeType: image.type,
      imageSizeBytes: image.size,
    };
  }

  const completedAt = new Date();
  const nextDueAt = computeNextDue(
    completedAt,
    task.frequencyInterval,
    task.frequencyUnit,
  );

  let result: { task: typeof task; completion: unknown };
  try {
    result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.task.updateMany({
        where: { id: task.id, userId },
        data: {
          lastDoneAt: completedAt,
          nextDueAt,
        },
      });
      if (updateResult.count === 0) {
        throw new Error("TASK_NOT_FOUND");
      }

      const updatedTask = await tx.task.findFirst({
        where: { id: task.id, userId },
      });
      if (!updatedTask) {
        throw new Error("TASK_NOT_FOUND");
      }

      const completion = await tx.taskCompletion.create({
        data: {
          taskId: task.id,
          completedAt,
          notes: notes || null,
          imagePath: imageData?.imagePath,
          imageFilename: imageData?.imageFilename,
          imageMimeType: imageData?.imageMimeType,
          imageSizeBytes: imageData?.imageSizeBytes,
        },
      });

      return { task: updatedTask, completion };
    });
  } catch (error) {
    if (error instanceof Error && error.message === "TASK_NOT_FOUND") {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }
    throw error;
  }

  return NextResponse.json(result);
}
