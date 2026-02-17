"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const NEW_CATEGORY_VALUE = "__new__";

export default function NewTask() {
  const [title, setTitle] = useState("");
  const [frequencyInterval, setFrequencyInterval] = useState(1);
  const [frequencyUnit, setFrequencyUnit] = useState("month");
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [lastDoneAt, setLastDoneAt] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) return;

        const data = (await res.json()) as { categories?: string[] };
        if (!isMounted) return;
        setExistingCategories(Array.isArray(data.categories) ? data.categories : []);
      } catch {
        if (!isMounted) return;
        setExistingCategories([]);
      }
    }

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    const chosenCategory =
      selectedCategory === NEW_CATEGORY_VALUE ? newCategory.trim() : selectedCategory.trim();

    try {
      setSaving(true);
      const payload: Record<string, unknown> = {
        title: title.trim(),
        category: chosenCategory,
        frequencyInterval,
        frequencyUnit,
        notes: notes.trim(),
      };
      if (lastDoneAt) payload.lastDoneAt = new Date(lastDoneAt).toISOString();

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create task.");
      const task = await res.json();
      router.push(`/tasks/${task.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <section className="page-head">
        <div>
          <h1>New Task</h1>
          <p className="page-subtext">
            Add a recurring job and set when it should come due.
          </p>
        </div>
      </section>

      <section className="card">
        <form onSubmit={handleSubmit} className="form">
          <div>
            <label htmlFor="title">Task title</label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Example: Replace HVAC filter"
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

          <div className="form-row">
            <div>
              <label htmlFor="category">Category (optional)</label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">No category</option>
                {existingCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
                <option value={NEW_CATEGORY_VALUE}>New category...</option>
              </select>
              {selectedCategory === NEW_CATEGORY_VALUE ? (
                <>
                  <label htmlFor="newCategory" className="subfield-label">
                    New category name
                  </label>
                  <input
                    id="newCategory"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="HVAC, Plumbing, Yard"
                  />
                </>
              ) : null}
            </div>
            <div>
              <label htmlFor="lastDoneAt">Last done date (optional)</label>
              <input
                id="lastDoneAt"
                type="date"
                value={lastDoneAt}
                onChange={(e) => setLastDoneAt(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes">Task notes (optional)</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Details that should be shown whenever you do this task."
            />
          </div>

          {error ? <p className="error">{error}</p> : null}

          <div className="actions">
            <button disabled={saving} className="btn btn-primary" type="submit">
              {saving ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
