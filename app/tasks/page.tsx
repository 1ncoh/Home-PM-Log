import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { redirect } from "next/navigation";

type TasksPageProps = {
  searchParams: Promise<{ category?: string }>;
};

function daysUntil(date?: Date | null) {
  if (!date) return Number.POSITIVE_INFINITY;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function duePillClass(days: number) {
  if (days < 0) return "pill pill-overdue";
  if (days <= 7) return "pill pill-due";
  return "pill pill-ok";
}

function dueLabel(date?: Date | null) {
  if (!date) return "No due date";
  const days = daysUntil(date);
  if (days < 0) return `${Math.abs(days)} day(s) overdue`;
  if (days === 0) return "Due today";
  return `Due in ${days} day(s)`;
}

async function getCategories(userId: string) {
  const rows = await prisma.task.findMany({
    where: { userId, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  return rows
    .map((row) => row.category?.trim())
    .filter((category): category is string => Boolean(category));
}

async function getTasks(userId: string, category?: string) {
  return prisma.task.findMany({
    where: category ? { userId, category } : { userId },
    orderBy: [{ nextDueAt: "asc" }, { createdAt: "desc" }],
    include: { completions: { select: { id: true } } },
  });
}

function categoryHref(category?: string) {
  if (!category) return "/tasks";
  return `/tasks?category=${encodeURIComponent(category)}`;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const { category } = await searchParams;
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const selectedCategory = category?.trim() || "";
  const [tasks, categories] = await Promise.all([
    getTasks(userId, selectedCategory || undefined),
    getCategories(userId),
  ]);

  const overdueCount = tasks.filter((t) => daysUntil(t.nextDueAt) < 0).length;
  const dueSoonCount = tasks.filter((t) => {
    const d = daysUntil(t.nextDueAt);
    return d >= 0 && d <= 7;
  }).length;

  return (
    <div className="stack">
      <section className="page-head">
        <div>
          <h1>Tasks</h1>
          <p className="page-subtext">
            Keep recurring chores on track and open any task for full history.
          </p>
        </div>
        <Link href="/tasks/new" className="btn btn-primary">
          New Task
        </Link>
      </section>

      <section className="task-grid">
        <div className="card">
          <div className="metric">{tasks.length}</div>
          <div className="task-meta">Total tasks</div>
        </div>
        <div className="card">
          <div className="metric">{overdueCount}</div>
          <div className="task-meta">Overdue</div>
        </div>
        <div className="card">
          <div className="metric">{dueSoonCount}</div>
          <div className="task-meta">Due in 7 days</div>
        </div>
      </section>

      <section className="card stack">
        <div className="section-head">
          <h2>{selectedCategory ? `${selectedCategory} Tasks` : "All Tasks"}</h2>
          {categories.length > 0 ? (
            <div className="filter-row">
              <Link
                href={categoryHref()}
                className={
                  selectedCategory ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"
                }
              >
                All
              </Link>
              {categories.map((categoryName) => {
                const isActive = categoryName === selectedCategory;
                return (
                  <Link
                    key={categoryName}
                    href={categoryHref(categoryName)}
                    className={isActive ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
                  >
                    {categoryName}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
        {tasks.length === 0 ? (
          <p className="task-meta">
            {selectedCategory
              ? `No tasks in "${selectedCategory}" yet.`
              : "No tasks yet. Create one to start your maintenance log."}
          </p>
        ) : (
          tasks.map((task) => {
            const days = daysUntil(task.nextDueAt);
            return (
              <article key={task.id} className="task-item">
                <div>
                  <h3>
                    <Link href={`/tasks/${task.id}`}>{task.title}</Link>
                  </h3>
                  <div className="task-meta">
                    {task.category ? `${task.category} - ` : ""}
                    Every {task.frequencyInterval} {task.frequencyUnit}
                    {task.frequencyInterval > 1 ? "s" : ""}
                  </div>
                  <div className="task-meta">
                    {task.nextDueAt
                      ? `Next due ${new Date(task.nextDueAt).toLocaleDateString()}`
                      : "No due date set"}
                    {" - "}
                    {task.completions.length} completion log
                    {task.completions.length === 1 ? "" : "s"}
                  </div>
                </div>
                <span className={duePillClass(days)}>{dueLabel(task.nextDueAt)}</span>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
