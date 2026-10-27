"use client";

import { useMemo, useRef, useState } from "react";
import { FileCard } from "@/components/FileCard";
import { FolderIcon } from "@/components/FolderPicker";
import { PencilIcon, TrashIcon, UploadIcon } from "@/components/Icons";
import { useFileStore } from "@/components/useFileStore";
import {
  AGES, KINDS, MAX_FILE_BYTES, NO_FILTERS, SORTS, activeFilterCount, filterFiles, folderOf, formatBytes, inView, rejectReason,
  type AgeFilter, type FileFilters, type FileKind, type FileSort, type FolderView,
} from "@/lib/files";
import { MAX_FOLDER_NAME, sameName, validateFolderName } from "@/lib/folders";

type Upload = { key: number; name: string; progress: number; error?: string; done?: boolean };
type Mode = "idle" | "new" | "rename" | "delete";

const PARALLEL = 3;
const SUGGESTIONS = ["Brand", "Decks", "Reports", "Images", "Spreadsheets", "Contracts"];
let nextKey = 1;

const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
const hasInternal = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("text/x-punx-file");

export default function FilesPage() {
  const store = useFileStore();
  const pickRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<FolderView>({ type: "all" });
  const [filters, setFilters] = useState<FileFilters>(NO_FILTERS);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  // Drag and drop: which file card is being dragged, and which folder tile it is over ("" is Unfiled).
  const [dragId, setDragId] = useState<string | null>(null);
  const [overTile, setOverTile] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [draft, setDraft] = useState("");
  const [folderError, setFolderError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const patch = (key: number, p: Partial<Upload>) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const set = <K extends keyof FileFilters>(k: K, v: FileFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  // A folder someone just deleted (or emptied by renaming) quietly falls back to everything.
  const current: FolderView =
    view.type === "folder" && !store.folders.some((f) => sameName(f, view.name)) ? { type: "all" } : view;
  const folderName = current.type === "folder" ? current.name : "";
  const uploadTarget = folderName;

  const countIn = (name: string) => store.files.filter((f) => sameName(folderOf(f), name)).length;
  const unfiledCount = store.files.filter((f) => folderOf(f) === "").length;

  async function start(list: FileList | File[], folder: string) {
    const chosen = Array.from(list);
    if (chosen.length === 0) return;

    const bad: string[] = [];
    const ok: { file: File; key: number }[] = [];
    for (const file of chosen) {
      const why = rejectReason(file);
      if (why) bad.push(why);
      else ok.push({ file, key: nextKey++ });
    }
    setRejected(bad);
    if (ok.length === 0) return;
    setUploads((u) => [...u.filter((x) => !x.done), ...ok.map(({ file, key }) => ({ key, name: file.name, progress: 0 }))]);

    // A few at a time, so a big drop doesn't saturate the connection.
    const queue = [...ok];
    const worker = async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        try {
          await store.upload(item.file, folder, (p) => patch(item.key, { progress: p }));
          patch(item.key, { progress: 1, done: true });
          // Finished uploads clear themselves; the file appears in the grid right away.
          setTimeout(() => setUploads((u) => u.filter((x) => x.key !== item.key)), 1800);
        } catch (e) {
          patch(item.key, { error: friendly(e) });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, ok.length) }, worker));
  }

  function resetFolderForm() {
    setMode("idle");
    setDraft("");
    setFolderError(null);
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      return true;
    } catch {
      setFolderError("That didn’t work. Check your connection and try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submitNew(value: string) {
    const err = validateFolderName(value, store.folders);
    if (err) return setFolderError(err);
    if (await run(() => store.createFolder(value.trim()))) {
      setView({ type: "folder", name: value.trim() });
      resetFolderForm();
    }
  }

  async function submitRename() {
    if (current.type !== "folder") return;
    const err = validateFolderName(draft, store.folders, current.name);
    if (err) return setFolderError(err);
    if (await run(() => store.renameFolder(current.name, draft.trim()))) {
      setView({ type: "folder", name: draft.trim() });
      resetFolderForm();
    }
  }

  async function confirmDelete() {
    if (current.type !== "folder") return;
    if (await run(() => store.deleteFolder(current.name))) {
      setView({ type: "all" });
      resetFolderForm();
    }
  }

  function dropOnTile(e: React.DragEvent, target: string) {
    e.preventDefault();
    setOverTile(null);
    const id = e.dataTransfer.getData("text/x-punx-file") || dragId;
    setDragId(null);
    if (id && !hasFiles(e)) {
      const file = store.files.find((f) => f.id === id);
      if (file && !sameName(folderOf(file), target)) void store.move(file, target);
    } else if (hasFiles(e)) {
      void start(e.dataTransfer.files, target);
    }
  }

  const inCurrent = useMemo(() => store.files.filter((f) => inView(f, current)), [store.files, current]);
  const counts = useMemo(() => {
    const c = new Map<FileKind, number>();
    inCurrent.forEach((f) => c.set(f.kind, (c.get(f.kind) ?? 0) + 1));
    return c;
  }, [inCurrent]);
  const people = useMemo(() => {
    const m = new Map<string, string>();
    store.files.forEach((f) => m.set(f.uploaderUid, f.uploaderName));
    return [...m].filter(([uid]) => uid !== store.me).sort((a, b) => a[1].localeCompare(b[1]));
  }, [store.files, store.me]);

  // A type filter whose last file is gone quietly stops applying.
  const kindNow = filters.kind !== "all" && counts.has(filters.kind) ? filters.kind : "all";
  const effective: FileFilters = { ...filters, kind: kindNow };
  const shown = filterFiles(store.files, current, effective, store.me);
  const narrowed = activeFilterCount(effective);
  const totalSize = inCurrent.reduce((n, f) => n + f.size, 0);
  const title = current.type === "all" ? "All files" : current.type === "unfiled" ? "Unfiled" : current.name;
  const where = current.type === "all" ? "" : current.type === "unfiled" ? " in Unfiled" : ` in ${current.name}`;
  const uploading = uploads.some((u) => !u.done && !u.error);
  const unusedSuggestions = SUGGESTIONS.filter((s) => !store.folders.some((f) => sameName(f, s)));
  const showUnfiled = store.folders.length > 0;

  const tile = (label: string, count: number, active: boolean, onClick: () => void, drop?: string) => (
    <button
      key={label}
      role="tab"
      aria-selected={active}
      className={`folder-tile${active ? " is-active" : ""}${drop !== undefined && overTile === drop ? " is-over" : ""}`}
      onClick={() => {
        onClick();
        resetFolderForm();
      }}
      onDragOver={
        drop === undefined
          ? undefined
          : (e) => {
              if (!hasFiles(e) && !hasInternal(e)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = hasFiles(e) ? "copy" : "move";
              if (overTile !== drop) setOverTile(drop);
            }
      }
      onDragLeave={drop === undefined ? undefined : () => setOverTile((o) => (o === drop ? null : o))}
      onDrop={drop === undefined ? undefined : (e) => dropOnTile(e, drop)}
    >
      <FolderIcon />
      <span className="folder-name">{label}</span>
      <span className="folder-count">{count}</span>
    </button>
  );

  return (
    <div className="library files-page">
      <header className="files-head">
        <p className="eyebrow">Team archive</p>
        <h1>Files</h1>
        <p className="muted">
          Keep images, slide decks, spreadsheets and other files in one place. Everyone at punx.ai can see, open and organize them into folders; only you can rename or delete the ones you add.
        </p>
        {store.temporary && !store.problem && (
          <p className="notice-inline" role="note">Preview: files you add here stay in this browser tab only and disappear when you close it.</p>
        )}
      </header>

      <aside className="library-side">
        <div className={`folders${dragId || over ? " is-dragging" : ""}`} role="tablist" aria-label="File folders">
          {tile("All files", store.files.length, current.type === "all", () => setView({ type: "all" }))}
          {store.folders.map((f) =>
            tile(f, countIn(f), current.type === "folder" && sameName(current.name, f), () => setView({ type: "folder", name: f }), f),
          )}
          {showUnfiled && tile("Unfiled", unfiledCount, current.type === "unfiled", () => setView({ type: "unfiled" }), "")}
          <button
            className="folder-tile folder-add"
            onClick={() => {
              setMode(mode === "new" ? "idle" : "new");
              setDraft("");
              setFolderError(null);
            }}
            aria-expanded={mode === "new"}
          >
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
                void submitNew(draft);
              }}
            >
              <input
                autoFocus
                value={draft}
                maxLength={MAX_FOLDER_NAME}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setFolderError(null);
                }}
                placeholder="Folder name, e.g. Brand"
                aria-label="New folder name"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(folderError)}
                disabled={busy}
              />
              <button className="btn primary" type="submit" disabled={busy}>Create</button>
              <button className="btn" type="button" onClick={resetFolderForm}>Cancel</button>
            </form>
            {folderError && <span className="error" role="alert">{folderError}</span>}
            {unusedSuggestions.length > 0 && (
              <div className="chips">
                {unusedSuggestions.map((s) => (
                  <button key={s} className="chip chip-sm" onClick={() => void submitNew(s)}>+ {s}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>

      <section className="library-main">
        <div className="folder-head">
          <div style={{ minWidth: 0 }}>
            <h2>{title}</h2>
            <p className="muted folder-sub">
              {inCurrent.length} file{inCurrent.length === 1 ? "" : "s"}
              {inCurrent.length > 0 && ` · ${formatBytes(totalSize)}`}
            </p>
          </div>
          {current.type === "folder" && mode !== "rename" && mode !== "delete" && (
            <div className="folder-actions">
              <button className="btn btn-ghost" onClick={() => { setMode("rename"); setDraft(current.name); setFolderError(null); }}>
                <PencilIcon size={16} /> Rename
              </button>
              <button className="btn btn-ghost btn-ghost-danger" onClick={() => { setMode("delete"); setFolderError(null); }}>
                <TrashIcon size={16} /> Delete
              </button>
            </div>
          )}
        </div>

        {current.type === "folder" && (mode === "rename" || mode === "delete") && (
          <div className="folder-bar">
            {mode === "rename" ? (
              <form
                className="folder-new"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitRename();
                }}
              >
                <input autoFocus value={draft} maxLength={MAX_FOLDER_NAME} onChange={(e) => { setDraft(e.target.value); setFolderError(null); }} aria-label="Folder name" autoComplete="off" spellCheck={false} aria-invalid={Boolean(folderError)} disabled={busy} />
                <button className="btn primary" type="submit" disabled={busy}>Save</button>
                <button className="btn" type="button" onClick={resetFolderForm}>Cancel</button>
              </form>
            ) : (
              <>
                <span className="muted">
                  Delete “{current.name}”?{" "}
                  {countIn(current.name) === 0
                    ? "It’s empty."
                    : `Its ${countIn(current.name) === 1 ? "1 file stays" : `${countIn(current.name)} files stay`} in the archive as Unfiled.`}
                </span>
                <button className="btn danger" onClick={() => void confirmDelete()} disabled={busy}>Delete folder</button>
                <button className="btn" onClick={resetFolderForm}>Cancel</button>
              </>
            )}
            {folderError && <span className="error" role="alert">{folderError}</span>}
          </div>
        )}

        {store.problem ? (
          <div className="notice error-box" role="alert">
            <strong>Files aren’t available</strong>
            <span>{store.problem}</span>
          </div>
        ) : (
          <div
            className={`dropzone${store.files.length > 0 ? " compact" : ""}${over ? " is-over" : ""}`}
            onDragOver={(e) => {
              if (!hasFiles(e)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              setOver(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
            }}
            onDrop={(e) => {
              if (!hasFiles(e)) return;
              e.preventDefault();
              setOver(false);
              void start(e.dataTransfer.files, uploadTarget);
            }}
          >
            <span className="notice-icon"><UploadIcon /></span>
            <strong>{over ? "Drop to upload" : "Drag files here"}</strong>
            <span className="muted">or</span>
            <button className="btn primary" onClick={() => pickRef.current?.click()}>Choose files</button>
            <input
              ref={pickRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) void start(e.target.files, uploadTarget);
                e.target.value = "";
              }}
            />
            <span className="muted dropzone-hint">
              {uploadTarget ? <>Goes into <strong>{uploadTarget}</strong>. </> : store.folders.length > 0 ? "Goes into Unfiled; drop onto a folder to file it there. " : ""}
              Up to {formatBytes(MAX_FILE_BYTES)} each. Programs (.exe, .msi, …) aren’t allowed.
            </span>
          </div>
        )}

        {rejected.length > 0 && (
          <div className="notice error-box" role="alert">
            <strong>{rejected.length === 1 ? "One file was skipped" : `${rejected.length} files were skipped`}</strong>
            {rejected.map((r) => (
              <span key={r}>{r}</span>
            ))}
            <button className="link-btn" onClick={() => setRejected([])}>Dismiss</button>
          </div>
        )}

        {uploads.length > 0 && (
          <ul className="upload-list" aria-label="Uploads" aria-live="polite">
            {uploads.map((u) => (
              <li key={u.key} className={`upload${u.error ? " has-error" : ""}`}>
                <span className="upload-name">{u.name}</span>
                <span className="muted upload-state">{u.error ? "Failed" : u.done ? "Done ✓" : `${Math.round(u.progress * 100)}%`}</span>
                <div className="progress" role="progressbar" aria-label={`Uploading ${u.name}`} aria-valuenow={Math.round(u.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${Math.round(u.progress * 100)}%` }} />
                </div>
                {u.error && (
                  <p className="error upload-error" role="alert">
                    {u.error}{" "}
                    <button className="link-btn" onClick={() => setUploads((x) => x.filter((y) => y.key !== u.key))}>Dismiss</button>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {!store.ready && <div className="skeleton" style={{ height: 120, marginTop: 12 }} aria-busy="true" />}

        {store.ready && !store.problem && store.files.length === 0 && !uploading && (
          <p className="muted files-empty">Nothing archived yet. Add your first file above.</p>
        )}

        {store.files.length > 0 && (
          <>
            <div className="files-tools">
              <input
                className="filter"
                type="search"
                placeholder="Search name, type (pptx), person or folder…"
                value={filters.query}
                onChange={(e) => set("query", e.target.value)}
                aria-label="Search files"
              />

              <div className="filter-row">
                <label className="select-field">
                  <span>Added by</span>
                  <select value={filters.uploader} onChange={(e) => set("uploader", e.target.value)}>
                    <option value="all">Everyone</option>
                    <option value="me">Me</option>
                    {people.map(([uid, name]) => (
                      <option key={uid} value={uid}>{name}</option>
                    ))}
                  </select>
                </label>
                <label className="select-field">
                  <span>Added</span>
                  <select value={filters.age} onChange={(e) => set("age", e.target.value as AgeFilter)}>
                    {AGES.map((a) => (
                      <option key={a.id} value={a.id}>{a.label}</option>
                    ))}
                  </select>
                </label>
                <label className="select-field">
                  <span>Sort by</span>
                  <select value={filters.sort} onChange={(e) => set("sort", e.target.value as FileSort)}>
                    {SORTS.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </label>
                {narrowed > 0 && (
                  <button className="link-btn" onClick={() => setFilters((f) => ({ ...NO_FILTERS, sort: f.sort }))}>Clear filters ({narrowed})</button>
                )}
              </div>

              <div className="chips scroll" role="group" aria-label="File type">
                <button className={`chip${kindNow === "all" ? " is-active" : ""}`} aria-pressed={kindNow === "all"} onClick={() => set("kind", "all")}>
                  All types · {inCurrent.length}
                </button>
                {KINDS.filter((k) => counts.has(k.id)).map((k) => (
                  <button key={k.id} className={`chip${kindNow === k.id ? " is-active" : ""}`} aria-pressed={kindNow === k.id} onClick={() => set("kind", k.id)}>
                    {k.label} · {counts.get(k.id)}
                  </button>
                ))}
              </div>
            </div>

            <p className="muted result-count" role="status">
              {narrowed === 0 ? `${shown.length} file${shown.length === 1 ? "" : "s"}${where}` : `${shown.length} of ${inCurrent.length} file${inCurrent.length === 1 ? "" : "s"}${where}`}
              {narrowed > 0 && current.type !== "all" && (
                <>
                  {" · "}
                  <button className="link-btn inline" onClick={() => setView({ type: "all" })}>Search all folders</button>
                </>
              )}
            </p>

            {store.folders.length > 0 && inCurrent.length > 0 && (
              <p className="muted drag-tip">Tip: drag a file onto a folder to move it, or drop files from your computer straight onto a folder.</p>
            )}

            {shown.length === 0 ? (
              <p className="muted">
                {narrowed > 0 ? "No files match those filters." : current.type === "all" ? "Nothing here." : `Nothing in ${title} yet. Upload above or drag files onto it.`}
              </p>
            ) : (
              <div className="file-grid">
                {shown.map((f) => (
                  <FileCard
                    key={f.id}
                    file={f}
                    store={store}
                    showFolder={current.type === "all"}
                    dragged={dragId === f.id}
                    onDragStart={setDragId}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverTile(null);
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function friendly(e: unknown): string {
  const code = (e as { code?: string }).code ?? "";
  if (code === "storage/unauthorized" || code === "permission-denied") return "You don’t have permission to upload here.";
  if (code === "storage/canceled") return "Upload canceled.";
  if (code === "storage/retry-limit-exceeded" || code === "storage/network-request-failed") return "The connection dropped. Try again.";
  if (code === "storage/unknown" || code === "storage/bucket-not-found" || code === "storage/object-not-found") return "File storage isn’t turned on for this project yet.";
  return "Couldn’t upload this file. Try again.";
}
