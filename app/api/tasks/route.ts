import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeNextDue } from "@/lib/dates";
import { getCurrentUserId } from "@/lib/auth";

const ALLOWED_UNITS = new Set(["day", "week", "month", "year"]);

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { title, category, frequencyInterval, frequencyUnit, notes, lastDoneAt } = body;
  const parsedInterval = Number(frequencyInterval);

  if (!title || !frequencyInterval || !frequencyUnit) {
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

  const task = await prisma.task.create({
    data: {
      userId,
      title,
      category: category || null,
      frequencyInterval: parsedInterval,
      frequencyUnit,
      lastDoneAt: parsedLastDoneAt,
      nextDueAt,
      notes: notes || null,
    },
  });

  return NextResponse.json(task);
}
