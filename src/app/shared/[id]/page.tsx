"use client";

import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FolderIcon } from "@/components/FolderPicker";
import { useBookmarks } from "@/components/BookmarksProvider";
import { useAuth } from "@/components/AuthProvider";
import { RepoCard } from "@/components/RepoCard";
import { useViews } from "@/components/Views";
import { db } from "@/lib/firebase";
import type { Share } from "@/lib/types";
import { shareStatKey } from "@/lib/views";

type State = { status: "loading" } | { status: "missing" } | { status: "error" } | { status: "ok"; share: Share };

export default function SharedFolderPage() {
  const { id } = useParams<{ id: string }>();
  const { importFolder } = useBookmarks();
  const { user } = useAuth();
  const [state, setState] = useState<State>({ status: "loading" });
  const [result, setResult] = useState<{ folder: string; added: number } | null>(null);
  const [busy, setBusy] = useState(false);

  // The owner previewing their own link shouldn't count as a view.
  const views = useViews(shareStatKey(id), state.status === "ok" && state.share.ownerUid !== user?.uid);

  useEffect(() => {
    if (!db) return setState({ status: "error" });
    let cancelled = false;
    // Firestore keeps retrying when the database is unreachable, so give up after a while.
    const timer = setTimeout(() => !cancelled && setState({ status: "error" }), 10000);
    getDoc(doc(db, "shares", id)).then(
      (snap) => {
        if (cancelled) return;
        clearTimeout(timer);
        setState(snap.exists() ? { status: "ok", share: { ...(snap.data() as Omit<Share, "id">), id: snap.id } } : { status: "missing" });
      },
      () => {
        if (cancelled) return;
        clearTimeout(timer);
        setState({ status: "error" });
      },
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  if (state.status === "loading") return <p className="muted">Loading shared folder…</p>;

  if (state.status !== "ok") {
    return (
      <div className="notice">
        <strong>{state.status === "missing" ? "This shared folder isn’t available." : "Couldn’t load this shared folder."}</strong>
        <span>
          {state.status === "missing"
            ? "The owner may have stopped sharing it or deleted the folder."
            : "Check your connection and try again."}
        </span>
        <Link className="btn primary" href="/">Go home</Link>
      </div>
    );
  }

  const { share } = state;

  async function save() {
    setBusy(true);
    try {
      setResult(await importFolder(share.folder, share.repos));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="repo-hero">
        <span className="quick-icon"><FolderIcon /></span>
        <div>
          <p className="eyebrow">Shared folder</p>
          <h1>{share.folder}</h1>
          <p className="muted">
            Shared by {share.ownerName} · {share.repos.length} repo{share.repos.length === 1 ? "" : "s"}{views !== null && ` · ${views} view${views === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      <div className="actions">
        <button className="btn primary" onClick={save} disabled={busy || share.repos.length === 0}>
          {busy ? "Saving…" : "Save folder to my library"}
        </button>
      </div>

      {result && (
        <div className="answer" role="status">
          {result.added === 0
            ? "You already have all of these saved."
            : `Added ${result.added} repo${result.added === 1 ? "" : "s"} to “${result.folder}”.`}{" "}
          <Link href="/library">Open library</Link>
        </div>
      )}

      {share.repos.length === 0 && <p className="muted">This folder is empty right now.</p>}
      <div className="grid">
        {share.repos.map((r) => (
          <RepoCard key={r.fullName} repo={r} />
        ))}
      </div>
    </>
  );
}
