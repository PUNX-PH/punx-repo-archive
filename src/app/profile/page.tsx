"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useBookmarks } from "@/components/BookmarksProvider";
import { ALLOWED_DOMAIN } from "@/lib/domain";
import type { Bookmark } from "@/lib/types";

// Only follow same-site paths, so a crafted ?next= can't send someone elsewhere.
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/profile") ? n : null);

function Profile() {
  const { user, loading, configured, authError, signInGoogle, signOut } = useAuth();
  const { bookmarks, replaceAll } = useBookmarks();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // After sign-in, go back to wherever they were headed.
  useEffect(() => {
    if (user && next) router.replace(next);
  }, [user, next, router]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      const msg = (e as Error).message;
      // Closing the Google popup isn't an error worth showing.
      if (!/popup-closed|cancelled-popup/.test(msg)) setError(msg.replace("Firebase: ", ""));
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
        <div className="actions">
          <button className="btn" onClick={() => run(async () => { await signOut(); router.replace("/profile"); })}>Sign out</button>
        </div>
      </>
    );
  }

  return (
    <div className="gate">
      <h1>Sign in to continue</h1>
      <p className="muted">
        Punx Repo Archive is for the Punx team. Search, Ask and your library unlock once you sign in with your <strong>@{ALLOWED_DOMAIN}</strong> Google account.
      </p>

      {configured ? (
        <button className="btn primary wide" disabled={busy} onClick={() => run(signInGoogle)}>
          {busy ? "Opening Google…" : `Sign in with your @${ALLOWED_DOMAIN} account`}
        </button>
      ) : (
        <div className="notice error-box">
          <strong>Sign-in isn’t set up in this build.</strong>
          <span>The Firebase keys are missing, so nobody can sign in yet.</span>
        </div>
      )}

      {(authError || error) && <p className="error" role="alert">{authError ?? error}</p>}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <Profile />
    </Suspense>
  );
}
