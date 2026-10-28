"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { copyText, fileLink } from "@/lib/copy";
import { accessSummary } from "@/lib/file-share";
import { MAX_FILE_NAME, extOf, folderIdOf, formatBytes, formatWhen, sharingOf, validateFileName, type ArchiveFile } from "@/lib/files";
import { FolderIcon } from "./FolderPicker";
import { CheckIcon, LinkIcon, LockIcon, PencilIcon, ShareIcon, TrashIcon } from "./Icons";
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
  /** Show which folder it is in (when looking at more than one folder). */
  showFolder?: boolean;
  onShare: (file: ArchiveFile) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  dragged?: boolean;
  /** Set when this card was opened from a shared link, so it stands out. */
  highlighted?: boolean;
};

// One archived file. What the buttons offer depends on the person's role: owners can do everything,
// editors can rename, viewers can open.
export function FileCard({ file, store, showFolder, onShare, onDragStart, onDragEnd, dragged, highlighted }: Props) {
  const role = store.roleOnFile(file);
  const owner = role === "owner";
  const [mode, setMode] = useState<"idle" | "rename" | "delete" | "move">("idle");
  const [draft, setDraft] = useState(file.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mode === "rename") inputRef.current?.select();
  }, [mode]);

  useEffect(() => {
    if (highlighted) cardRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlighted]);

  const folder = store.folders.find((f) => f.id === folderIdOf(file));
  const movable = store.folders.filter((f) => store.roleOnFolder(f) !== "viewer");
  const access = accessSummary(sharingOf(file));
  const shared = access.icon !== "lock";

  async function copyLink() {
    if (await copyText(fileLink(window.location.origin, file))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } else {
      setError("Couldn’t copy. Open the file and copy the address from your browser instead.");
    }
  }

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

  async function run(fn: () => Promise<void>, failure: string, done?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      done?.();
    } catch {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }

  function saveName() {
    const err = validateFileName(draft);
    if (err) return setError(err);
    if (draft.trim() === file.name) return setMode("idle");
    void run(() => store.rename(file, draft.trim()), "Couldn’t rename it. Try again.", () => setMode("idle"));
  }

  return (
    <article
      ref={cardRef}
      className={`file-card${dragged ? " is-dragged" : ""}${highlighted ? " is-highlighted" : ""}`}
      draggable={owner && mode === "idle"}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/x-punx-file", file.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(file.id);
      }}
      onDragEnd={() => onDragEnd?.()}
    >
      <Link href={`/files/${file.id}`} className="file-thumb-link" draggable={false} tabIndex={-1} aria-hidden="true">
        <Thumb file={file} urlFor={store.urlFor} />
      </Link>

      <div className="file-body">
        {mode === "rename" ? (
          <form
            className="file-rename"
            onSubmit={(e) => {
              e.preventDefault();
              saveName();
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
          <h3 className="file-name" title={file.name}>
            <Link href={`/files/${file.id}`} draggable={false}>{file.name}</Link>
          </h3>
        )}

        <p className="muted file-meta">
          {formatBytes(file.size)} · {owner ? "You" : file.uploaderName} · {formatWhen(file.createdAt)}
        </p>
        <p className="file-access" title={owner ? access.label : role === "editor" ? "You can edit" : "You can view"}>
          {owner ? (shared ? <ShareIcon size={14} /> : <LockIcon size={14} />) : null}
          <span>{owner ? access.label : role === "editor" ? "Can edit" : "View only"}</span>
        </p>
        {showFolder && folder && (
          <p className="file-folder"><FolderIcon /> <span>{folder.name}</span></p>
        )}

        {mode === "move" && (
          <div className="file-move">
            <label htmlFor={`move-${file.id}`} className="muted">Move to</label>
            <select
              id={`move-${file.id}`}
              value={folderIdOf(file)}
              onChange={(e) => void run(() => store.move(file, e.target.value), "Couldn’t move it. Try again.", () => setMode("idle"))}
              disabled={busy}
              autoFocus
            >
              <option value="">No folder</option>
              {movable.map((f) => (
                <option key={f.id} value={f.id}>{f.name}{store.roleOnFolder(f) === "owner" ? "" : ` (${f.ownerName || "shared"})`}</option>
              ))}
              {folderIdOf(file) && !movable.some((f) => f.id === folderIdOf(file)) && <option value={folderIdOf(file)}>{folder?.name ?? "Current folder"}</option>}
            </select>
            <button className="btn" onClick={() => setMode("idle")} disabled={busy}>Cancel</button>
          </div>
        )}

        {mode === "delete" ? (
          <div className="file-confirm">
            <span className="muted">{shared ? "Delete this file for everyone it’s shared with?" : "Delete this file?"}</span>
            <div className="file-row">
              <button className="btn danger" onClick={() => void run(() => store.remove(file), "Couldn’t delete it. Try again.")} disabled={busy}>{busy ? "Deleting…" : "Delete"}</button>
              <button className="btn" onClick={() => setMode("idle")} disabled={busy}>Cancel</button>
            </div>
          </div>
        ) : (
          mode === "idle" && (
            <div className="file-row file-actions">
              <button className="btn" onClick={open}>Open</button>
              <button className="btn btn-ghost" onClick={copyLink} aria-label={`Copy link to ${file.name}`}>
                {copied ? <><CheckIcon size={16} /> Copied</> : <><LinkIcon size={16} /> Copy link</>}
              </button>
              {owner && (
                <button className="btn" onClick={() => onShare(file)} aria-label={`Share ${file.name}`}>
                  <ShareIcon size={16} /> Share
                </button>
              )}
              {owner && (
                <button className="btn btn-ghost" onClick={() => { setMode("move"); setError(null); }} aria-label={`Move ${file.name} to a folder`}>
                  <FolderIcon /> Move
                </button>
              )}
              {role !== "viewer" && (
                <button className="btn btn-ghost" onClick={() => { setDraft(file.name); setMode("rename"); setError(null); }} aria-label={`Rename ${file.name}`}>
                  <PencilIcon size={16} /> Rename
                </button>
              )}
              {owner && (
                <button className="btn btn-ghost btn-ghost-danger" onClick={() => { setMode("delete"); setError(null); }} aria-label={`Delete ${file.name}`}>
                  <TrashIcon size={16} /> Delete
                </button>
              )}
            </div>
          )
        )}

        {error && <p className="error file-error" role="alert">{error}</p>}
      </div>
    </article>
  );
}
