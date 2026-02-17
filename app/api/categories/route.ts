import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.task.findMany({
    where: { userId, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  const categories = rows
    .map((row) => row.category?.trim())
    .filter((category): category is string => Boolean(category));

  return NextResponse.json({ categories });
}
