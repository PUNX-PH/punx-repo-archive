"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "./Icons";
import { rememberSearch } from "./RecentSearches";

export function SearchBox({ initial = "", autoFocus = false }: { initial?: string; autoFocus?: boolean }) {
  const [q, setQ] = useState(initial);
  const router = useRouter();

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
          placeholder="Search repos or topics…"
          aria-label="Search repositories"
          autoFocus={autoFocus}
          enterKeyHint="search"
          autoComplete="off"
        />
      </div>
      <button type="submit">Search</button>
    </form>
  );
}
