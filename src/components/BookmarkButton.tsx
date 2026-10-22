"use client";

import type { Repo } from "@/lib/types";
import { useBookmarks } from "./BookmarksProvider";

export function BookmarkButton({ repo, label = false }: { repo: Repo; label?: boolean }) {
  const { isSaved, toggle } = useBookmarks();
  const saved = isSaved(repo.fullName);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggle(repo);
  }

  return (
    <button
      className={`bookmark-btn${saved ? " is-saved" : ""}`}
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${repo.fullName} from bookmarks` : `Bookmark ${repo.fullName}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M6 3h12v18l-6-4-6 4z" />
      </svg>
      {label && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
