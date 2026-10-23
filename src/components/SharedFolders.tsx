"use client";

import Link from "next/link";
import { useState } from "react";
import { useBookmarks } from "./BookmarksProvider";
import { FolderIcon } from "./FolderPicker";
import { ShareIcon } from "./Icons";
import { ViewCount } from "./Views";
import { sameName } from "@/lib/folders";
import { shareStatKey } from "@/lib/views";

// The Library's "Shared" tab: folders you've shared, folders you could share, and folders
// teammates shared that you've opened.
export function SharedFolders({
  onOpenFolder,
  onShare,
}: {
  onOpenFolder: (folder: string) => void;
  /** Opens the share dialog for a folder, to create or manage its link. */
  onShare: (folder: string) => void;
}) {
  const { bookmarks, folders, shares, sharedWithMe, forgetShared } = useBookmarks();
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(id: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/shared/${id}`);
      setCopied(id);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      // Clipboard blocked: the link is still available from Manage.
    }
  }

  // Folders with repos that aren't shared yet: one tap to share each.
  const shareable = folders
    .map((f) => ({ name: f, count: bookmarks.filter((b) => sameName(b.list, f)).length }))
    .filter((f) => f.count > 0 && !shares.some((s) => sameName(s.folder, f.name)));

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
              {shareable.length > 0
                ? "Pick a folder below to get a link teammates can open."
                : "Save some repos into a folder first, then share it from here."}
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
                    {s.repos.length} repo{s.repos.length === 1 ? "" : "s"}<ViewCount statKey={shareStatKey(s.id)} prefix=" · " />
                  </span>
                </div>
                <button className="btn" onClick={() => onOpenFolder(s.folder)}>Open</button>
                <button className="btn" onClick={() => copy(s.id)}>{copied === s.id ? "Copied ✓" : "Copy link"}</button>
                <button className="btn primary" onClick={() => onShare(s.folder)}>Manage</button>
              </div>
            ))}
          </div>
        )}

        {shareable.length > 0 && (
          <>
            <p className="muted" style={{ margin: "16px 0 0", fontSize: "0.9rem" }}>Share another folder</p>
            <div className="chips">
              {shareable.map((f) => (
                <button key={f.name} className="chip" onClick={() => onShare(f.name)}>
                  <ShareIcon size={14} />&nbsp;{f.name} · {f.count}
                </button>
              ))}
            </div>
          </>
        )}
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
