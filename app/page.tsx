import Link from "next/link";

export default function Home() {
  return (
    <section className="hero">
      <p className="eyebrow">Household operations</p>
      <h1>Keep recurring maintenance on schedule.</h1>
      <p className="hero-copy">
        Track what needs doing, when it was last completed, and keep a visual
        log of every sign-off with notes and photos.
      </p>
      <div className="hero-actions">
        <Link href="/tasks" className="btn btn-primary">
          Open Tasks
        </Link>
        <Link href="/tasks/new" className="btn btn-secondary">
          Add First Task
        </Link>
      </div>
    </section>
  );
}
