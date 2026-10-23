"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "punx.recent.v1";

export function readRecentSearches(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function rememberSearch(q: string) {
  try {
    const next = [q, ...readRecentSearches().filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, 6);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

export function RecentSearches() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => setItems(readRecentSearches()), []);

  if (items.length === 0) return null;

  return (
    <section aria-label="Recent searches">
      <div className="section-head">
        <h2>Recent</h2>
        <button
          className="link-btn"
          onClick={() => {
            try {
              localStorage.removeItem(KEY);
            } catch {}
            setItems([]);
          }}
        >
          Clear
        </button>
      </div>
      <div className="chips">
        {items.map((s) => (
          <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className="chip">{s}</Link>
        ))}
      </div>
    </section>
  );
}
