"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const redirectTo = searchParams.get("redirectTo") || "/tasks";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"signin" | "signup" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function onSignIn(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!supabase) {
      setError("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and key env vars.");
      return;
    }
    setBusy("signin");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setBusy(null);
      return;
    }

    router.replace(redirectTo);
    router.refresh();
  }

  async function onSignUp() {
    setError("");
    setMessage("");
    if (!supabase) {
      setError("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and key env vars.");
      return;
    }
    setBusy("signup");

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setBusy(null);
      return;
    }

    setMessage("Account created. If email confirmation is enabled, confirm your email first.");
    setBusy(null);
  }

  return (
    <section className="card auth-card">
      <h1>Sign in</h1>
      <p className="page-subtext">Use your Supabase account to access your tasks.</p>
      <form onSubmit={onSignIn} className="form">
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="task-meta">{message}</p> : null}
        <div className="actions">
          <button disabled={busy !== null} className="btn btn-primary" type="submit">
            {busy === "signin" ? "Signing in..." : "Sign in"}
          </button>
          <button
            disabled={busy !== null}
            className="btn btn-secondary"
            type="button"
            onClick={onSignUp}
          >
            {busy === "signup" ? "Creating..." : "Create account"}
          </button>
        </div>
      </form>
    </section>
  );
}
