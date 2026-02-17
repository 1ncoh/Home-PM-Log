import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import TaskEditor from "./TaskEditor";
import { redirect } from "next/navigation";

async function getTask(id: string, userId: string) {
  return prisma.task.findFirst({
    where: { id, userId },
    include: {
      completions: {
        orderBy: { completedAt: "desc" },
      },
    },
  });
}

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolved = await params;
  const id = resolved.id;
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const task = await getTask(id, userId);
  if (!task) return <div className="card">Task not found.</div>;

  return <TaskEditor task={task} />;
}
