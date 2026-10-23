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

function write(list: string[]) {
  try {
    if (list.length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

export function rememberSearch(q: string) {
  write([q, ...readRecentSearches().filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, 6));
}

/** Removes one recent search. Returns what's left. */
export function forgetSearch(q: string): string[] {
  const next = readRecentSearches().filter((s) => s.toLowerCase() !== q.toLowerCase());
  write(next);
  return next;
}

export function clearSearches() {
  write([]);
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
            clearSearches();
            setItems([]);
          }}
        >
          Clear all
        </button>
      </div>
      <div className="chips">
        {items.map((s) => (
          <span key={s} className="chip-removable">
            <Link href={`/search?q=${encodeURIComponent(s)}`} className="chip">{s}</Link>
            <button className="chip-x" onClick={() => setItems(forgetSearch(s))} aria-label={`Remove “${s}” from recent searches`}>×</button>
          </span>
        ))}
      </div>
    </section>
  );
}
