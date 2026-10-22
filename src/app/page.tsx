"use client";

import Link from "next/link";
import { useBookmarks } from "@/components/BookmarksProvider";
import { SearchBox } from "@/components/SearchBox";
import { formatStars } from "@/components/RepoCard";

const SHORTCUTS = [
  { label: "AI agents", q: "topic:ai-agents" },
  { label: "Claude Code", q: "claude code skills" },
  { label: "Next.js", q: "topic:nextjs stars:>500" },
  { label: "CLI tools", q: "topic:cli stars:>1000" },
  { label: "Self-hosted", q: "topic:self-hosted stars:>1000" },
];

export default function Home() {
  const { bookmarks } = useBookmarks();

  return (
    <>
      <h1 className="hero-title">Find the repo<br />before you build it.</h1>
      <SearchBox />

      <div className="chips">
        {SHORTCUTS.map((s) => (
          <Link key={s.label} href={`/search?q=${encodeURIComponent(s.q)}`} className="chip">{s.label}</Link>
        ))}
      </div>

      <Link href="/ask" className="ask-banner">
        <strong>Not sure what to search?</strong>
        <span>Ask whether a repo exists →</span>
      </Link>

      <section>
        <div className="section-head">
          <h2>Recently saved</h2>
          <Link href="/library">See all</Link>
        </div>
        {bookmarks.length === 0 ? (
          <p className="muted">Nothing saved yet. Bookmark a repo and it shows up here.</p>
        ) : (
          <div className="carousel">
            {bookmarks.slice(0, 10).map((b) => (
              <Link key={b.fullName} href={`/repo/${b.owner}/${b.name}`} className="tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.avatar} alt="" width={40} height={40} className="avatar" />
                <h3>{b.fullName}</h3>
                <p>{b.description ?? "No description."}</p>
                <span className="meta">★ {formatStars(b.stars)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
