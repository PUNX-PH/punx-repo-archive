"use client";

import { listsOf } from "@/lib/folders";
import { useBookmarks } from "./BookmarksProvider";

export function LibraryPeek() {
  const { bookmarks, ready } = useBookmarks();
  if (!ready) return <span className="sub">&nbsp;</span>;
  if (bookmarks.length === 0) return <span className="sub">Save repos and sort them into folders</span>;
  const used = new Set(bookmarks.flatMap((b) => listsOf(b).map((l) => l.toLowerCase()))).size;
  return <span className="sub">{bookmarks.length} saved in {used} folder{used === 1 ? "" : "s"}</span>;
}
