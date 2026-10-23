"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BookmarkButton } from "@/components/BookmarkButton";
import { useBookmarks } from "@/components/BookmarksProvider";
import { FolderIcon } from "@/components/FolderPicker";
import { BookmarkIcon, ShareIcon, StarIcon } from "@/components/Icons";
import { formatStars } from "@/components/RepoCard";
import { ShareDialog } from "@/components/ShareDialog";
import { SharedFolders } from "@/components/SharedFolders";
import { ViewCount } from "@/components/Views";
import { DEFAULT_LIST, FOLDER_SUGGESTIONS, MAX_FOLDER_NAME, sameName, validateFolderName } from "@/lib/folders";
import { languageColor } from "@/lib/languages";
import { shareStatKey } from "@/lib/views";

type Mode = "idle" | "new" | "rename" | "delete";

function LibraryInner() {
  const {
    bookmarks, folders, ready, createFolder, renameFolder, deleteFolder, openFolderPicker,
    canShare, shares, shareFolder, unshareFolder, sharedWithMe,
  } = useBookmarks();
  const params = useSearchParams();
  const wanted = params.get("folder");
  const [view, setView] = useState<"folders" | "shared">("folders");
  const [shareFor, setShareFor] = useState<string | null>(null);
  const [active, setActive] = useState(wanted ?? "All");
  const [filter, setFilter] = useState("");
  const [mode, setMode] = useState<Mode>("idle");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wanted) {
      setActive(wanted);
      setView("folders");
    }
  }, [wanted]);

  if (!ready) {
    return (
      <>
        <h1>Library</h1>
        <div className="skeleton" style={{ height: 120, marginTop: 12 }} aria-busy="true" />
      </>
    );
  }

  const count = (f: string) => bookmarks.filter((b) => sameName(b.list, f)).length;
  const shareOf = (f: string) => shares.find((s) => sameName(s.folder, f));
  const current = active === "All" || folders.some((f) => sameName(f, active)) ? active : "All";
  const editable = current !== "All" && current !== DEFAULT_LIST;
  const currentShare = current === "All" ? undefined : shareOf(current);
  const total = current === "All" ? bookmarks.length : count(current);

  const shown = bookmarks.filter(
    (b) =>
      (current === "All" || sameName(b.list, current)) &&
      (!filter || `${b.fullName} ${b.description ?? ""}`.toLowerCase().includes(filter.toLowerCase())),
  );

  function reset() {
    setMode("idle");
    setDraft("");
    setError(null);
  }

  async function submitNew(value: string) {
    const err = validateFolderName(value, folders);
    if (err) return setError(err);
    const made = await createFolder(value);
    if (made) {
      setActive(made);
      reset();
    }
  }

  async function submitRename() {
    const err = validateFolderName(draft, folders, current);
    if (err) return setError(err);
    await renameFolder(current, draft.trim());
    setActive(draft.trim());
    reset();
  }

  const suggestions = FOLDER_SUGGESTIONS.filter((s) => !folders.some((f) => sameName(f, s)));
  const sharedCount = shares.length + sharedWithMe.length;

  return (
    <div className="library">
      <h1>Library</h1>

      <div className="library-tabs">
        <div className="segmented" role="tablist" aria-label="Library sections">
          <button role="tab" aria-selected={view === "folders"} className={view === "folders" ? "is-active" : undefined} onClick={() => setView("folders")}>
            Folders
          </button>
          <button role="tab" aria-selected={view === "shared"} className={view === "shared" ? "is-active" : undefined} onClick={() => setView("shared")}>
            Shared{sharedCount > 0 ? ` · ${sharedCount}` : ""}
          </button>
        </div>
      </div>

      {view === "shared" ? (
        <div className="library-wide">
          <SharedFolders
            onOpenFolder={(f) => {
              setActive(f);
              setView("folders");
            }}
            onShare={(f) => setShareFor(f)}
          />
        </div>
      ) : (
        <>
          <aside className="library-side">
            <div className="folders" role="tablist" aria-label="Folders">
              <button role="tab" aria-selected={current === "All"} className={`folder-tile${current === "All" ? " is-active" : ""}`} onClick={() => { setActive("All"); reset(); }}>
                <FolderIcon />
                <span className="folder-name">All</span>
                <span className="folder-count">{bookmarks.length}</span>
              </button>
              {folders.map((f) => (
                <button key={f} role="tab" aria-selected={sameName(f, current)} className={`folder-tile${sameName(f, current) ? " is-active" : ""}`} onClick={() => { setActive(f); reset(); }}>
                  <FolderIcon />
                  <span className="folder-name">{f}</span>
                  {shareOf(f) && (
                    <span className="folder-shared" title="Shared by link"><ShareIcon size={14} /><span className="sr-only">Shared</span></span>
                  )}
                  <span className="folder-count">{count(f)}</span>
                </button>
              ))}
              <button className="folder-tile folder-add" onClick={() => { setMode(mode === "new" ? "idle" : "new"); setDraft(""); setError(null); }} aria-expanded={mode === "new"}>
                <span aria-hidden="true">＋</span>
                <span className="folder-name">New folder</span>
              </button>
            </div>

            {mode === "new" && (
              <div className="notice">
                <form
                  className="folder-new"
                  style={{ width: "100%" }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitNew(draft);
                  }}
                >
                  <input
                    autoFocus
                    value={draft}
                    maxLength={MAX_FOLDER_NAME}
                    onChange={(e) => { setDraft(e.target.value); setError(null); }}
                    placeholder="Folder name, e.g. Java"
                    aria-label="New folder name"
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={Boolean(error)}
                  />
                  <button className="btn primary" type="submit">Create</button>
                  <button className="btn" type="button" onClick={reset}>Cancel</button>
                </form>
                {error && <span className="error" role="alert">{error}</span>}
                {suggestions.length > 0 && (
                  <div className="chips">
                    {suggestions.map((s) => (
                      <button key={s} className="chip chip-sm" onClick={() => submitNew(s)}>+ {s}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>

          <section className="library-main">
            <div className="folder-head">
              <div style={{ minWidth: 0 }}>
                <h2>{current === "All" ? "All saves" : current}</h2>
                <p className="muted folder-sub">
                  {total} repo{total === 1 ? "" : "s"}
                  {currentShare && <> · Shared<ViewCount statKey={shareStatKey(currentShare.id)} prefix=" · " /></>}
                </p>
              </div>
              <div className="folder-actions">
                {current !== "All" && (
                  <button className={`btn${currentShare ? "" : " primary"}`} onClick={() => setShareFor(current)}>
                    <ShareIcon /> {currentShare ? "Shared" : "Share"}
                  </button>
                )}
                {editable && mode === "idle" && (
                  <>
                    <button className="link-btn" onClick={() => { setMode("rename"); setDraft(current); setError(null); }}>Rename</button>
                    <button className="link-btn" onClick={() => setMode("delete")}>Delete</button>
                  </>
                )}
              </div>
            </div>

            {editable && (mode === "rename" || mode === "delete") && (
              <div className="folder-bar">
                {mode === "rename" ? (
                  <form
                    className="folder-new"
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitRename();
                    }}
                  >
                    <input autoFocus value={draft} maxLength={MAX_FOLDER_NAME} onChange={(e) => { setDraft(e.target.value); setError(null); }} aria-label="Folder name" autoComplete="off" spellCheck={false} aria-invalid={Boolean(error)} />
                    <button className="btn primary" type="submit">Save</button>
                    <button className="btn" type="button" onClick={reset}>Cancel</button>
                  </form>
                ) : (
                  <>
                    <span className="muted">Delete “{current}”? {count(current) === 1 ? "Its 1 repo moves" : `Its ${count(current)} repos move`} back to {DEFAULT_LIST}.{currentShare && " Its share link stops working."}</span>
                    <button
                      className="btn danger"
                      onClick={async () => {
                        await deleteFolder(current);
                        setActive("All");
                        reset();
                      }}
                    >
                      Delete folder
                    </button>
                    <button className="btn" onClick={reset}>Cancel</button>
                  </>
                )}
                {error && <span className="error" role="alert">{error}</span>}
              </div>
            )}

            {bookmarks.length > 0 && (
              <input
                className="filter"
                type="search"
                placeholder={current === "All" ? "Filter your saves…" : `Filter in ${current}…`}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter your saved repos"
              />
            )}

            {bookmarks.length === 0 && (
              <div className="notice">
                <span className="notice-icon"><BookmarkIcon /></span>
                <strong>Your library is empty</strong>
                <span>Tap the bookmark on any repo to save it here, then sort saves into folders like Java or Design.</span>
                <Link className="btn primary" href="/search">Find repos</Link>
              </div>
            )}
            {bookmarks.length > 0 && shown.length === 0 && (
              <p className="muted">{filter ? "No saves match that filter." : `Nothing in ${current} yet. Open a saved repo and use its folder button to move it here.`}</p>
            )}

            <div className="grid">
              {shown.map((b) => (
                <article key={b.fullName} className="repo-card">
                  <Link href={`/repo/${b.owner}/${b.name}`} className="repo-card-link">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.avatar} alt="" width={44} height={44} className="avatar" />
                    <div className="repo-card-body">
                      <h3 translate="no"><span className="owner">{b.owner}/</span>{b.name}</h3>
                      <p className="desc">{b.description ?? "No description provided."}</p>
                      <div className="meta">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><StarIcon /> {formatStars(b.stars)}</span>
                        {b.language && (
                          <span className="lang"><span className="dot" style={{ background: languageColor(b.language) }} />{b.language}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                  <div className="card-side">
                    <BookmarkButton repo={b} />
                    <button className="folder-btn" onClick={() => openFolderPicker(b.fullName)} aria-label={`Move ${b.fullName} to a folder. Currently in ${b.list}.`}>
                      <FolderIcon />
                      <span>{b.list}</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {shareFor && (
        <ShareDialog
          folder={shareFor}
          repoCount={count(shareFor)}
          share={shareOf(shareFor)}
          canShare={canShare}
          onCreate={() => shareFolder(shareFor)}
          onStop={() => unshareFolder(shareFor)}
          onClose={() => setShareFor(null)}
        />
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<h1>Library</h1>}>
      <LibraryInner />
    </Suspense>
  );
}
