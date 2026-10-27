"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_FILE_NAME, extOf, folderOf, formatBytes, formatWhen, validateFileName, type ArchiveFile } from "@/lib/files";
import { sameName } from "@/lib/folders";
import { FolderIcon } from "./FolderPicker";
import { PencilIcon, TrashIcon } from "./Icons";
import type { FileStore } from "./useFileStore";

const THUMB_LIMIT = 15 * 1024 * 1024;

function Thumb({ file, urlFor }: { file: ArchiveFile; urlFor: FileStore["urlFor"] }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const wantsImage = file.kind === "image" && file.size <= THUMB_LIMIT && !/svg/i.test(file.contentType);

  useEffect(() => {
    if (!wantsImage) return;
    let live = true;
    urlFor(file).then(
      (u) => live && setSrc(u),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [wantsImage, file, urlFor]);

  if (wantsImage && !failed) {
    return (
      <div className="file-thumb" aria-hidden="true">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
        ) : (
          <div className="skeleton file-thumb-skel" />
        )}
      </div>
    );
  }

  const ext = extOf(file.name);
  return (
    <div className="file-thumb" aria-hidden="true">
      <span className="file-badge" data-kind={file.kind}>{(ext || file.kind).slice(0, 5)}</span>
    </div>
  );
}

type Props = {
  file: ArchiveFile;
  store: FileStore;
  /** Show which folder it is in (when looking at everything). */
  showFolder?: boolean;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  dragged?: boolean;
};

// One archived file: a preview or type badge, its details, and Open / Move for everyone, Rename / Delete for the uploader.
export function FileCard({ file, store, showFolder, onDragStart, onDragEnd, dragged }: Props) {
  const mine = store.me !== null && file.uploaderUid === store.me;
  const [mode, setMode] = useState<"idle" | "rename" | "delete" | "move">("idle");
  const [draft, setDraft] = useState(file.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "rename") inputRef.current?.select();
  }, [mode]);

  async function open() {
    setError(null);
    // Open the tab now (while the click still counts) and point it at the file once the link is ready.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const url = await store.urlFor(file);
      if (tab) tab.location.href = url;
      else window.location.href = url;
    } catch {
      tab?.close();
      setError("Couldn’t open that file.");
    }
  }

  async function saveName() {
    const err = validateFileName(draft);
    if (err) return setError(err);
    if (draft.trim() === file.name) return setMode("idle");
    setBusy(true);
    try {
      await store.rename(file, draft.trim());
      setMode("idle");
      setError(null);
    } catch {
      setError("Couldn’t rename it. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function moveTo(folder: string) {
    setBusy(true);
    setError(null);
    try {
      await store.move(file, folder);
      setMode("idle");
    } catch {
      setError("Couldn’t move it. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    try {
      await store.remove(file);
    } catch {
      setError("Couldn’t delete it. Try again.");
      setBusy(false);
    }
  }

  return (
    <article
      className={`file-card${dragged ? " is-dragged" : ""}`}
      draggable={mode === "idle"}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/x-punx-file", file.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(file.id);
      }}
      onDragEnd={() => onDragEnd?.()}
    >
      <Thumb file={file} urlFor={store.urlFor} />

      <div className="file-body">
        {mode === "rename" ? (
          <form
            className="file-rename"
            onSubmit={(e) => {
              e.preventDefault();
              void saveName();
            }}
          >
            <input
              ref={inputRef}
              value={draft}
              maxLength={MAX_FILE_NAME}
              onChange={(e) => {
                setDraft(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Escape" && setMode("idle")}
              aria-label="File name"
              aria-invalid={Boolean(error)}
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
            />
            <div className="file-row">
              <button className="btn primary" type="submit" disabled={busy}>Save</button>
              <button className="btn" type="button" onClick={() => { setMode("idle"); setError(null); }} disabled={busy}>Cancel</button>
            </div>
          </form>
        ) : (
          <h3 className="file-name" title={file.name}>{file.name}</h3>
        )}

        <p className="muted file-meta">
          {formatBytes(file.size)} · {file.uploaderName} · {formatWhen(file.createdAt)}
        </p>
        {showFolder && folderOf(file) && (
          <p className="file-folder"><FolderIcon /> <span>{folderOf(file)}</span></p>
        )}

        {mode === "move" && (
          <div className="file-move">
            <label htmlFor={`move-${file.id}`} className="muted">Move to</label>
            <select
              id={`move-${file.id}`}
              value={folderOf(file)}
              onChange={(e) => void moveTo(e.target.value)}
              disabled={busy}
              autoFocus
            >
              <option value="">Unfiled</option>
              {store.folders.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
              {folderOf(file) && !store.folders.some((f) => sameName(f, folderOf(file))) && <option value={folderOf(file)}>{folderOf(file)}</option>}
            </select>
            <button className="btn" onClick={() => setMode("idle")} disabled={busy}>Cancel</button>
          </div>
        )}

        {mode === "delete" ? (
          <div className="file-confirm">
            <span className="muted">Delete this file for everyone?</span>
            <div className="file-row">
              <button className="btn danger" onClick={confirmDelete} disabled={busy}>{busy ? "Deleting…" : "Delete"}</button>
              <button className="btn" onClick={() => setMode("idle")} disabled={busy}>Cancel</button>
            </div>
          </div>
        ) : (
          mode === "idle" && (
            <div className="file-row file-actions">
              <button className="btn" onClick={open}>Open</button>
              <button className="btn btn-ghost" onClick={() => { setMode("move"); setError(null); }} aria-label={`Move ${file.name} to a folder`}>
                <FolderIcon /> Move
              </button>
              {mine && (
                <>
                  <button className="btn btn-ghost" onClick={() => { setDraft(file.name); setMode("rename"); setError(null); }} aria-label={`Rename ${file.name}`}>
                    <PencilIcon size={16} /> Rename
                  </button>
                  <button className="btn btn-ghost btn-ghost-danger" onClick={() => { setMode("delete"); setError(null); }} aria-label={`Delete ${file.name}`}>
                    <TrashIcon size={16} /> Delete
                  </button>
                </>
              )}
            </div>
          )
        )}

        {error && <p className="error file-error" role="alert">{error}</p>}
      </div>
    </article>
  );
}
