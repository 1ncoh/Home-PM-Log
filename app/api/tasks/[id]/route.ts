import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeNextDue } from "@/lib/dates";
import { getCurrentUserId } from "@/lib/auth";

const ALLOWED_UNITS = new Set(["day", "week", "month", "year"]);

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = await req.json();
  const { title, category, frequencyInterval, frequencyUnit, notes, lastDoneAt } = body;
  const parsedInterval = Number(frequencyInterval);

  if (!title || !parsedInterval || !frequencyUnit) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!ALLOWED_UNITS.has(frequencyUnit)) {
    return NextResponse.json({ error: "Invalid frequency unit." }, { status: 400 });
  }

  if (!Number.isInteger(parsedInterval) || parsedInterval < 1) {
    return NextResponse.json(
      { error: "Frequency interval must be an integer >= 1." },
      { status: 400 },
    );
  }

  const parsedLastDoneAt = lastDoneAt ? new Date(lastDoneAt) : null;
  const nextDueAt = computeNextDue(parsedLastDoneAt, parsedInterval, frequencyUnit);

  const updateResult = await prisma.task.updateMany({
    where: { id, userId },
    data: {
      title: String(title).trim(),
      category: category ? String(category).trim() : null,
      frequencyInterval: parsedInterval,
      frequencyUnit,
      notes: notes ? String(notes).trim() : null,
      lastDoneAt: parsedLastDoneAt,
      nextDueAt,
    },
  });

  if (updateResult.count === 0) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const updated = await prisma.task.findFirst({ where: { id, userId } });
  if (!updated) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const result = await prisma.task.deleteMany({ where: { id, userId } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
