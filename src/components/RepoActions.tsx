"use client";

import { useState } from "react";
import type { Repo } from "@/lib/types";
import { BookmarkButton } from "./BookmarkButton";
import { useBookmarks } from "./BookmarksProvider";
import { FolderIcon } from "./FolderPicker";
import { CheckIcon, ShareIcon } from "./Icons";

// The row of things you do with a repo: save it, file it, send it to a teammate, open it on GitHub.
export function RepoActions({ repo }: { repo: Repo }) {
  const { bookmarks, openFolderPicker } = useBookmarks();
  const [copied, setCopied] = useState(false);
  const saved = bookmarks.find((b) => b.fullName === repo.fullName);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/repo/${repo.owner}/${repo.name}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked.
    }
  }

  return (
    <div className="actions">
      <BookmarkButton repo={repo} label />
      {saved && (
        <button className="btn" onClick={() => openFolderPicker(repo.fullName)} aria-label={`Change folder. Currently in ${saved.list}.`}>
          <FolderIcon /> {saved.list}
        </button>
      )}
      <button className="btn" onClick={copyLink}>
        {copied ? <><CheckIcon size={16} /> Link copied</> : <><ShareIcon /> Copy link</>}
      </button>
      <a className="btn primary" href={repo.url} target="_blank" rel="noopener noreferrer">Open on GitHub ↗</a>
    </div>
  );
}
