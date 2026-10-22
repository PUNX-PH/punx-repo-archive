"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { DEFAULT_LIST, useBookmarks } from "@/components/BookmarksProvider";
import { BookmarkButton } from "@/components/BookmarkButton";
import { formatStars } from "@/components/RepoCard";

const NEW_LIST = "__new__";

export default function LibraryPage() {
  const { user, loading } = useAuth();
  const { bookmarks, ready, moveToList } = useBookmarks();
  const [active, setActive] = useState("All");
  const [filter, setFilter] = useState("");

  const lists = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of bookmarks) counts.set(b.list, (counts.get(b.list) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [bookmarks]);

  const shown = bookmarks.filter(
    (b) =>
      (active === "All" || b.list === active) &&
      (!filter || `${b.fullName} ${b.description ?? ""}`.toLowerCase().includes(filter.toLowerCase())),
  );

  if (loading || !ready) return <p className="muted">Loading…</p>;

  if (!user) {
    return (
      <>
        <h1>Library</h1>
        <p className="muted">Sign in with your Punx account to save repos and keep them in lists.</p>
        <Link href="/profile" className="btn primary">Sign in</Link>
      </>
    );
  }

  function changeList(fullName: string, value: string) {
    if (value !== NEW_LIST) return moveToList(fullName, value);
    const name = window.prompt("Name your new list")?.trim();
    if (name) moveToList(fullName, name.slice(0, 40));
  }

  return (
    <>
      <h1>Library</h1>
      <input
        className="filter"
        type="search"
        placeholder="Filter your saves…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        aria-label="Filter your saved repos"
      />
      <div className="chips">
        <button className={`chip${active === "All" ? " is-active" : ""}`} onClick={() => setActive("All")}>
          All · {bookmarks.length}
        </button>
        {lists.map(([name, n]) => (
          <button key={name} className={`chip${active === name ? " is-active" : ""}`} onClick={() => setActive(name)}>
            {name} · {n}
          </button>
        ))}
      </div>

      {bookmarks.length === 0 && <p className="muted">No saves yet. Tap the bookmark on any repo to add it.</p>}

      <div className="stack">
        {shown.map((b) => (
          <article key={b.fullName} className="repo-card">
            <Link href={`/repo/${b.owner}/${b.name}`} className="repo-card-link">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.avatar} alt="" width={44} height={44} className="avatar" />
              <div className="repo-card-body">
                <h3>{b.fullName}</h3>
                <p>{b.description ?? "No description provided."}</p>
                <div className="meta">
                  <span>★ {formatStars(b.stars)}</span>
                  {b.language && <span>{b.language}</span>}
                </div>
              </div>
            </Link>
            <div className="card-side">
              <BookmarkButton repo={b} />
              <select
                value={b.list}
                onChange={(e) => changeList(b.fullName, e.target.value)}
                aria-label={`List for ${b.fullName}`}
              >
                {[...new Set([DEFAULT_LIST, ...lists.map(([n]) => n)])].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
                <option value={NEW_LIST}>New list…</option>
              </select>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
