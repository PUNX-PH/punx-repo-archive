"use client";

import Link from "next/link";
import { useState } from "react";
import { useBookmarks } from "./BookmarksProvider";
import { FolderIcon } from "./FolderPicker";
import { ShareIcon } from "./Icons";
import { ViewCount } from "./Views";
import { shareStatKey } from "@/lib/views";

// The Library's "Shared" tab: folders you've shared, and folders teammates shared that you've opened.
export function SharedFolders({ onOpenFolder }: { onOpenFolder: (folder: string) => void }) {
  const { canShare, shares, unshareFolder, sharedWithMe, forgetShared } = useBookmarks();
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function copy(id: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/shared/${id}`);
      setCopied(id);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      // Clipboard blocked: the link can still be opened from the list.
    }
  }

  async function stop(folder: string) {
    if (!window.confirm(`Stop sharing “${folder}”? The link will stop working for everyone who has it.`)) return;
    setError(null);
    try {
      await unshareFolder(folder);
    } catch {
      setError("Couldn’t stop sharing. Try again in a moment.");
    }
  }

  return (
    <>
      <section>
        <div className="section-head">
          <h2>Shared by you</h2>
        </div>
        {shares.length === 0 ? (
          <div className="notice">
            <span className="notice-icon"><ShareIcon /></span>
            <strong>You haven’t shared a folder yet</strong>
            <span>
              {canShare
                ? "Open a folder in the Folders tab and press Share this folder to get a link teammates can open."
                : "Sign in to share folders with a link."}
            </span>
          </div>
        ) : (
          <div className="shared-list">
            {shares.map((s) => (
              <div key={s.id} className="shared-item">
                <span className="quick-icon"><FolderIcon /></span>
                <div className="grow">
                  <strong>{s.folder}</strong>
                  <span className="muted" style={{ fontSize: "0.85rem" }}>
                    {s.repos.length} repo{s.repos.length === 1 ? "" : "s"} · <ViewCount statKey={shareStatKey(s.id)} />
                  </span>
                </div>
                <button className="btn" onClick={() => onOpenFolder(s.folder)}>Open folder</button>
                <button className="btn" onClick={() => copy(s.id)}>{copied === s.id ? "Copied ✓" : "Copy link"}</button>
                <button className="btn" onClick={() => stop(s.folder)}>Stop sharing</button>
              </div>
            ))}
          </div>
        )}
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <section>
        <div className="section-head">
          <h2>Shared with you</h2>
        </div>
        {sharedWithMe.length === 0 ? (
          <div className="notice">
            <span className="notice-icon"><ShareIcon /></span>
            <strong>Nothing shared with you yet</strong>
            <span>When a teammate sends you a folder link and you open it, it’s saved here so you can find it again.</span>
          </div>
        ) : (
          <div className="shared-list">
            {sharedWithMe.map((s) => (
              <div key={s.shareId} className="shared-item">
                <span className="quick-icon"><FolderIcon /></span>
                <div className="grow">
                  <strong>{s.folder}</strong>
                  <span className="muted" style={{ fontSize: "0.85rem" }}>
                    From {s.ownerName} · {s.repoCount} repo{s.repoCount === 1 ? "" : "s"}
                  </span>
                </div>
                <Link className="btn primary" href={`/shared/${s.shareId}`}>Open</Link>
                <button className="btn" onClick={() => forgetShared(s.shareId)} aria-label={`Remove ${s.folder} from this list`}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
