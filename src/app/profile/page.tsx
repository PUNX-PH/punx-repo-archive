"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useBookmarks } from "@/components/BookmarksProvider";

export default function ProfilePage() {
  const { user, loading, configured, signInGoogle, signInEmail, signUpEmail, signOut } = useAuth();
  const { bookmarks } = useBookmarks();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message.replace("Firebase: ", ""));
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <>
        <h1>Profile</h1>
        <div className="answer">
          Accounts aren’t connected yet. Add your Firebase keys to <code>.env.local</code> (see <code>.env.example</code>) and restart.
        </div>
      </>
    );
  }

  if (loading) return <p className="muted">Loading…</p>;

  if (user) {
    return (
      <>
        <h1>Profile</h1>
        <div className="profile-card">
          <strong>{user.displayName ?? user.email}</strong>
          {user.displayName && <span className="muted">{user.email}</span>}
          <span className="muted">{bookmarks.length} saved repos</span>
        </div>
        <button className="btn" onClick={() => run(signOut)}>Sign out</button>
      </>
    );
  }

  return (
    <>
      <h1>{mode === "in" ? "Sign in" : "Create your Punx account"}</h1>
      <p className="muted">Your bookmarks and lists sync to your account.</p>

      <button className="btn primary wide" disabled={busy} onClick={() => run(signInGoogle)}>
        Continue with Google
      </button>
      <div className="divider"><span>or</span></div>

      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => (mode === "in" ? signInEmail(email, password) : signUpEmail(email, password)));
        }}
      >
        <input type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input
          type="password"
          placeholder="Password"
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="btn wide" type="submit" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</button>
      </form>
      {error && <p className="error">{error}</p>}
      <button className="link" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
      </button>
    </>
  );
}
