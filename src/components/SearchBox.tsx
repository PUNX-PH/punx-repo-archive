"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SearchIcon } from "./Icons";
import { rememberSearch } from "./RecentSearches";

const HINTS = ["markdown editor", "self-hosted analytics", "react table component", "pdf parser in rust", "claude code skills", "open-source CRM"];

export function SearchBox({ initial = "", autoFocus = false, rotate = false }: { initial?: string; autoFocus?: boolean; rotate?: boolean }) {
  const [q, setQ] = useState(initial);
  const [hint, setHint] = useState(0);
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  // Rotating example searches in the placeholder, paused while typing and for reduced-motion users.
  useEffect(() => {
    if (!rotate || focused || q || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 3000);
    return () => clearInterval(id);
  }, [rotate, focused, q]);

  return (
    <form
      className="searchbox"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        if (!v) return;
        rememberSearch(v);
        router.push(`/search?q=${encodeURIComponent(v)}`);
      }}
    >
      <div className="search-field">
        <SearchIcon />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={rotate ? `Try “${HINTS[hint]}”` : "Search repos or topics…"}
          aria-label="Search repositories"
          autoFocus={autoFocus}
          enterKeyHint="search"
          autoComplete="off"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <kbd className="search-kbd" aria-hidden="true">/</kbd>
      </div>
      <button type="submit">Search</button>
    </form>
  );
}
