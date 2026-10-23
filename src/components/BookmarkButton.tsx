"use client";

import type { Repo } from "@/lib/types";
import { useBookmarks } from "./BookmarksProvider";
import { BookmarkIcon } from "./Icons";

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
      <BookmarkIcon filled={saved} />
      {label && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
