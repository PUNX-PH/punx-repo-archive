"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { inFolderOf } from "@/lib/folders";
import { cycleTheme } from "@/lib/theme";
import { useBookmarks } from "./BookmarksProvider";
import { clearSearches, forgetSearch, readRecentSearches } from "./RecentSearches";

type Item = { id: string; group: string; label: string; hint?: string; run: () => void; onRemove?: () => void };

const PAGES = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/ask", label: "Ask" },
  { href: "/library", label: "Library" },
  { href: "/profile", label: "Profile and settings" },
];

// Ctrl/Cmd + K: jump anywhere, search, ask, open a folder or switch theme without leaving the keyboard.
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { folders, bookmarks } = useBookmarks();
  const ref = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setQ("");
      setIdx(0);
      setRecents(readRecentSearches().slice(0, 4));
      d.showModal();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const query = q.trim();
    const lower = query.toLowerCase();
    const match = (s: string) => !lower || s.toLowerCase().includes(lower);
    const go = (path: string) => () => router.push(path);
    const out: Item[] = [];

    if (query) {
      const enc = encodeURIComponent(query);
      out.push({ id: "search", group: "Search", label: `Search GitHub for “${query}”`, run: go(`/search?q=${enc}`) });
      out.push({ id: "ask", group: "Search", label: `Ask Claude: “${query}”`, run: go(`/ask?q=${enc}`) });
    } else {
      recents.forEach((r) =>
        out.push({
          id: `recent-${r}`,
          group: "Recent searches",
          label: r,
          run: go(`/search?q=${encodeURIComponent(r)}`),
          onRemove: () => setRecents(forgetSearch(r).slice(0, 4)),
        }),
      );
    }

    PAGES.filter((p) => match(p.label)).forEach((p) => out.push({ id: p.href, group: "Go to", label: p.label, run: go(p.href) }));

    folders
      .filter((f) => match(f))
      .forEach((f) => {
        const n = bookmarks.filter((b) => inFolderOf(b, f)).length;
        out.push({ id: `folder-${f}`, group: "Folders", label: `Open folder “${f}”`, hint: `${n} repo${n === 1 ? "" : "s"}`, run: go(`/library?folder=${encodeURIComponent(f)}`) });
      });

    if (match("import") || match("csv") || match("list")) out.push({ id: "import", group: "Actions", label: "Import repos from a list", run: go("/library?import=1") });
    if (match("theme") || match("dark") || match("light")) out.push({ id: "theme", group: "Actions", label: "Switch theme (Auto, Light, Dark)", run: () => cycleTheme() });
    if (match("accent") || match("color")) out.push({ id: "accent", group: "Actions", label: "Change accent color", run: go("/profile#appearance") });
    return out;
  }, [q, recents, folders, bookmarks, router]);

  useEffect(() => setIdx(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [idx, items]);

  function run(i: Item | undefined) {
    if (!i) return;
    onClose();
    i.run();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
    } else if ((e.key === "Delete" || (e.key === "Backspace" && !q)) && items[idx]?.onRemove) {
      e.preventDefault();
      items[idx].onRemove?.();
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(items[idx]);
    }
  }

  let lastGroup = "";

  return (
    <dialog
      ref={ref}
      className="palette"
      aria-label="Quick find"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <div className="palette-body">
        <input
          className="palette-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search, ask, or jump to…"
          aria-label="Quick find"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={items[idx] ? `palette-${items[idx].id}` : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        <ul id="palette-list" role="listbox" className="palette-list" ref={listRef}>
          {items.map((it, i) => {
            const header = it.group !== lastGroup;
            lastGroup = it.group;
            return (
              <li key={it.id} role="presentation">
                {header && (
                  <div className="palette-group">
                    <span>{it.group}</span>
                    {it.group === "Recent searches" && (
                      <button className="palette-clear" onClick={() => { clearSearches(); setRecents([]); }}>Clear all</button>
                    )}
                  </div>
                )}
                <div
                  id={`palette-${it.id}`}
                  role="option"
                  aria-selected={i === idx}
                  className={`palette-item${i === idx ? " is-active" : ""}`}
                  onMouseMove={() => setIdx(i)}
                  onClick={() => run(it)}
                >
                  <span className="palette-label">{it.label}</span>
                  {it.hint && <span className="muted">{it.hint}</span>}
                  {it.onRemove && (
                    <button
                      className="palette-x"
                      aria-label={`Remove “${it.label}” from recent searches`}
                      onClick={(e) => {
                        e.stopPropagation();
                        it.onRemove?.();
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </li>
            );
          })}
          {items.length === 0 && <li className="palette-empty muted">Nothing matches. Press Enter to search GitHub.</li>}
        </ul>
        <div className="palette-foot muted" aria-hidden="true">
          <span><kbd>↑</kbd> <kbd>↓</kbd> to move</span>
          <span><kbd>Enter</kbd> to open</span>
          <span><kbd>Esc</kbd> to close</span>
        </div>
      </div>
    </dialog>
  );
}
