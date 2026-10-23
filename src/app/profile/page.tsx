"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useBookmarks } from "@/components/BookmarksProvider";
import { CheckIcon, GoogleIcon } from "@/components/Icons";
import { LogoMark } from "@/components/LogoMark";
import { ALLOWED_DOMAIN } from "@/lib/domain";
import type { Bookmark } from "@/lib/types";

// Only follow same-site paths, so a crafted ?next= can't send someone elsewhere.
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/profile") ? n : null);

function Profile() {
  const { user, loading, configured, authError, signInGoogle, signOut } = useAuth();
  const { bookmarks, folders, replaceAll } = useBookmarks();
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
    const name = user.displayName ?? user.email ?? "You";
    return (
      <>
        <h1>Profile</h1>
        <div className="profile-card">
          {user.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
          ) : (
            <span className="user-initial" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
          )}
          <div className="who">
            <strong>{name}</strong>
            {user.displayName && <span className="muted">{user.email}</span>}
            <span className="muted">{bookmarks.length} saved repo{bookmarks.length === 1 ? "" : "s"} in {folders.length} folder{folders.length === 1 ? "" : "s"}, synced to your account</span>
          </div>
        </div>

        <p className="muted" style={{ margin: "0 0 8px" }}>
          Folders you share, and ones teammates shared with you, are under <Link href="/library" style={{ textDecoration: "underline" }}>Library → Shared</Link>.
        </p>

        <h2>Your data</h2>
        <p className="muted" style={{ margin: "4px 0 0" }}>Download a backup of your bookmarks, or import one from a file.</p>
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

        <div className="actions" style={{ marginTop: 24 }}>
          <button className="btn" onClick={() => run(async () => { await signOut(); router.replace("/profile"); })}>Sign out</button>
        </div>
      </>
    );
  }

  return (
    <div className="gate">
      <span className="logo-mark"><LogoMark size={56} /></span>
      <h1>Sign in to continue</h1>
      <p className="muted" style={{ margin: 0 }}>Punx Repo Archive is for the Punx team. Use your <strong>@{ALLOWED_DOMAIN}</strong> Google account.</p>

      <ul>
        <li><CheckIcon size={18} /> Search GitHub and ask if a repo already exists</li>
        <li><CheckIcon size={18} /> Save repos into your own folders</li>
        <li><CheckIcon size={18} /> Share folders with teammates by link</li>
      </ul>

      {configured ? (
        <button className="btn wide" disabled={busy} onClick={() => run(signInGoogle)}>
          <GoogleIcon /> {busy ? "Opening Google…" : `Continue with Google`}
        </button>
      ) : (
        <div className="notice error-box">
          <strong>Sign-in isn’t set up in this build.</strong>
          <span>The Firebase keys are missing, so nobody can sign in yet.</span>
        </div>
      )}

      {(authError || error) && <p className="error" role="alert" style={{ marginTop: 14 }}>{authError ?? error}</p>}
      <p className="fine">Other Google accounts are signed straight back out.</p>
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
