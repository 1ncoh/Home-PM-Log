"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TaskCompletion = {
  id: string;
  completedAt: string | Date;
  notes: string | null;
  imagePath: string | null;
  imageFilename: string | null;
};

type Task = {
  id: string;
  title: string;
  category: string | null;
  frequencyInterval: number;
  frequencyUnit: string;
  notes: string | null;
  lastDoneAt: string | Date | null;
  nextDueAt: string | Date | null;
  completions: TaskCompletion[];
};

function daysUntil(date?: Date | string | null) {
  if (!date) return Number.POSITIVE_INFINITY;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function duePillClass(days: number) {
  if (days < 0) return "pill pill-overdue";
  if (days <= 7) return "pill pill-due";
  return "pill pill-ok";
}

function dueLabel(date?: Date | string | null) {
  if (!date) return "No due date";
  const days = daysUntil(date);
  if (days < 0) return `${Math.abs(days)} day(s) overdue`;
  if (days === 0) return "Due today";
  return `Due in ${days} day(s)`;
}

export default function TaskEditor({ task }: { task: Task }) {
  const router = useRouter();
  const [title, setTitle] = useState(task.title ?? "");
  const [category, setCategory] = useState(task.category ?? "");
  const [frequencyInterval, setFrequencyInterval] = useState(
    task.frequencyInterval ?? 1,
  );
  const [frequencyUnit, setFrequencyUnit] = useState(task.frequencyUnit ?? "month");
  const [notes, setNotes] = useState(task.notes ?? "");

  const [completionNotes, setCompletionNotes] = useState("");
  const [image, setImage] = useState<File | null>(null);

  const [savingTask, setSavingTask] = useState(false);
  const [signingOff, setSigningOff] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const status = useMemo(() => {
    const days = daysUntil(task.nextDueAt);
    return { days, label: dueLabel(task.nextDueAt), className: duePillClass(days) };
  }, [task.nextDueAt]);

  async function saveTask(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    try {
      setSavingTask(true);
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim(),
          frequencyInterval,
          frequencyUnit,
          notes: notes.trim(),
          lastDoneAt: task.lastDoneAt,
        }),
      });
      if (!res.ok) throw new Error("Failed to save task changes.");
      setSuccess("Task updated.");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
    } finally {
      setSavingTask(false);
    }
  }

  async function signOffTask(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      setSigningOff(true);
      const body = new FormData();
      body.append("notes", completionNotes.trim());
      if (image) body.append("image", image);

      const res = await fetch(`/api/tasks/${task.id}/mark-done`, {
        method: "POST",
        body,
      });
      if (!res.ok) throw new Error("Failed to sign off task.");

      setCompletionNotes("");
      setImage(null);
      setSuccess("Sign-off saved.");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
    } finally {
      setSigningOff(false);
    }
  }

  async function deleteTask() {
    const confirmed = window.confirm(
      "Delete this task and its history? This cannot be undone.",
    );
    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      setDeletingTask(true);
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete task.");
      router.push("/tasks");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
    } finally {
      setDeletingTask(false);
    }
  }

  return (
    <div className="stack">
      <section className="page-head">
        <div>
          <h1>{task.title}</h1>
          <p className="page-subtext">
            Last done{" "}
            {task.lastDoneAt ? new Date(task.lastDoneAt).toLocaleDateString() : "never"}.
          </p>
        </div>
        <span className={status.className}>{status.label}</span>
      </section>

      <section className="card">
        <h2>Task settings</h2>
        <form onSubmit={saveTask} className="form">
          <div>
            <label htmlFor="title">Title</label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div>
              <label htmlFor="interval">Frequency interval</label>
              <input
                id="interval"
                type="number"
                min={1}
                value={frequencyInterval}
                onChange={(e) => setFrequencyInterval(Number(e.target.value))}
              />
            </div>
            <div>
              <label htmlFor="unit">Frequency unit</label>
              <select
                id="unit"
                value={frequencyUnit}
                onChange={(e) => setFrequencyUnit(e.target.value)}
              >
                <option value="day">day</option>
                <option value="week">week</option>
                <option value="month">month</option>
                <option value="year">year</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="category">Category</label>
            <input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div>
            <label htmlFor="notes">Persistent task notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instructions you want to keep with this task."
            />
          </div>

          <div className="actions">
            <button type="submit" className="btn btn-secondary" disabled={savingTask}>
              {savingTask ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={deleteTask}
              disabled={deletingTask}
            >
              {deletingTask ? "Deleting..." : "Delete task"}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Sign Off</h2>
        <p className="page-subtext">
          Record completion now with optional notes and one image.
        </p>
        <form onSubmit={signOffTask} className="form">
          <div>
            <label htmlFor="completionNotes">Completion notes</label>
            <textarea
              id="completionNotes"
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="What was done, what you noticed, measurements, parts used..."
            />
          </div>

          <div>
            <label htmlFor="image">Image (optional)</label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="actions">
            <button type="submit" className="btn btn-primary" disabled={signingOff}>
              {signingOff ? "Saving..." : "Mark done now"}
            </button>
          </div>
        </form>
      </section>

      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="task-meta">{success}</p> : null}

      <section className="card stack">
        <h2>History</h2>
        {task.completions.length === 0 ? (
          <p className="task-meta">No completion logs yet.</p>
        ) : (
          task.completions.map((entry) => (
            <article key={entry.id} className="history-item">
              <strong>{new Date(entry.completedAt).toLocaleString()}</strong>
              {entry.notes ? <p className="history-notes">{entry.notes}</p> : null}
              {entry.imagePath ? (
                <a
                  className="history-image"
                  href={entry.imagePath}
                  target="_blank"
                  rel="noreferrer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.imagePath}
                    alt={entry.imageFilename ?? "Completion image"}
                  />
                </a>
              ) : null}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
