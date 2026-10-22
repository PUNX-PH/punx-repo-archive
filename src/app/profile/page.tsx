"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useBookmarks } from "@/components/BookmarksProvider";
import type { Bookmark } from "@/lib/types";

export default function ProfilePage() {
  const { user, loading, configured, signInGoogle, signInEmail, signUpEmail, signOut } = useAuth();
  const { bookmarks, replaceAll } = useBookmarks();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
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

  function exportJson() {
    const blob = new Blob([JSON.stringify(bookmarks, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "punx-bookmarks.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importJson(file: File) {
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data) || data.some((b) => typeof b?.fullName !== "string")) throw new Error();
      const existing = new Set(bookmarks.map((b) => b.fullName));
      const added = (data as Bookmark[]).filter((b) => !existing.has(b.fullName));
      await replaceAll(user ? added : [...bookmarks, ...added]);
      setMessage(`Imported ${added.length} new repo${added.length === 1 ? "" : "s"}.`);
    } catch {
      setMessage("That file isn’t a valid bookmarks export.");
    }
  }

  const tools = (
    <>
      <div className="actions">
        <button className="btn" onClick={exportJson} disabled={bookmarks.length === 0}>Export bookmarks</button>
        <button className="btn" onClick={() => fileRef.current?.click()}>Import bookmarks</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importJson(f);
            e.target.value = "";
          }}
        />
      </div>
      {message && <p role="status" className="muted">{message}</p>}
    </>
  );

  if (loading) return <p className="muted">Loading…</p>;

  if (user) {
    return (
      <>
        <h1>Profile</h1>
        <div className="profile-card">
          <strong>{user.displayName ?? user.email}</strong>
          {user.displayName && <span className="muted">{user.email}</span>}
          <span className="muted">{bookmarks.length} saved repo{bookmarks.length === 1 ? "" : "s"}, synced to your account</span>
        </div>
        {tools}
        <div className="actions">
          <button className="btn" onClick={() => run(signOut)}>Sign out</button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>{mode === "in" ? "Sign in" : "Create your Punx account"}</h1>
      <p className="muted">
        Sign in to sync bookmarks across devices. Anything you saved as a guest ({bookmarks.length}) is added to your account.
      </p>

      {configured ? (
        <>
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
      ) : (
        <div className="answer">Accounts aren’t connected in this build. Bookmarks are saved in this browser only.</div>
      )}

      {tools}
    </>
  );
}
