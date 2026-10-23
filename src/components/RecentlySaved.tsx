"use client";

import Link from "next/link";
import { languageColor } from "@/lib/languages";
import { useBookmarks } from "./BookmarksProvider";
import { BookmarkIcon, StarIcon } from "./Icons";
import { formatStars } from "./RepoCard";

export function RecentlySaved() {
  const { bookmarks, ready } = useBookmarks();

  return (
    <section>
      <div className="section-head">
        <h2>Recently saved</h2>
        {bookmarks.length > 0 && <Link href="/library">See all</Link>}
      </div>
      {!ready ? (
        <div className="carousel" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="tile skeleton-card"><div className="skeleton" style={{ height: 120 }} /></div>
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="notice">
          <span className="notice-icon"><BookmarkIcon /></span>
          <strong>Nothing saved yet</strong>
          <span>Tap the bookmark on any repo and it shows up here, so you can find it again.</span>
          <Link className="btn primary" href="/search">Find something to save</Link>
        </div>
      ) : (
        <div className="carousel">
          {bookmarks.slice(0, 10).map((b) => (
            <Link key={b.fullName} href={`/repo/${b.owner}/${b.name}`} className="tile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.avatar} alt="" width={40} height={40} className="avatar" />
              <h3>{b.name}</h3>
              <p>{b.description ?? "No description."}</p>
              <span className="meta">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><StarIcon /> {formatStars(b.stars)}</span>
                {b.language && (
                  <span className="lang"><span className="dot" style={{ background: languageColor(b.language) }} />{b.language}</span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
