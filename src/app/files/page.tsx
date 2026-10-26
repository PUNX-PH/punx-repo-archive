"use client";

import { useMemo, useRef, useState } from "react";
import { FileCard } from "@/components/FileCard";
import { UploadIcon } from "@/components/Icons";
import { useFileStore } from "@/components/useFileStore";
import { KINDS, MAX_FILE_BYTES, formatBytes, rejectReason, type FileKind } from "@/lib/files";

type Upload = { key: number; name: string; progress: number; error?: string; done?: boolean };

const PARALLEL = 3;
let nextKey = 1;

const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

export default function FilesPage() {
  const store = useFileStore();
  const pickRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  const [filter, setFilter] = useState("");
  const [picked, setKind] = useState<FileKind | "all">("all");

  const patch = (key: number, p: Partial<Upload>) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, ...p } : x)));

  async function start(list: FileList | File[]) {
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
          await store.upload(item.file, (p) => patch(item.key, { progress: p }));
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

  const counts = useMemo(() => {
    const c = new Map<FileKind, number>();
    store.files.forEach((f) => c.set(f.kind, (c.get(f.kind) ?? 0) + 1));
    return c;
  }, [store.files]);

  // A type filter whose last file was just deleted quietly falls back to All.
  const kind = picked !== "all" && counts.has(picked) ? picked : "all";
  const shown = store.files.filter(
    (f) => (kind === "all" || f.kind === kind) && (!filter.trim() || `${f.name} ${f.uploaderName}`.toLowerCase().includes(filter.trim().toLowerCase())),
  );
  const totalSize = store.files.reduce((n, f) => n + f.size, 0);
  const active = KINDS.filter((k) => counts.has(k.id));
  const uploading = uploads.some((u) => !u.done && !u.error);

  return (
    <>
      <p className="eyebrow">Team archive</p>
      <h1>Files</h1>
      <p className="muted">
        Keep images, slide decks, spreadsheets and other files in one place. Everyone at punx.ai can see and open them; only you can rename or delete the ones you add.
      </p>

      {store.temporary && !store.problem && (
        <p className="notice-inline" role="note">Preview: files you add here stay in this browser tab only and disappear when you close it.</p>
      )}

      {store.problem ? (
        <div className="notice error-box" role="alert">
          <strong>Files aren’t available</strong>
          <span>{store.problem}</span>
        </div>
      ) : (
        <div
          className={`dropzone${over ? " is-over" : ""}`}
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
            void start(e.dataTransfer.files);
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
              if (e.target.files) void start(e.target.files);
              e.target.value = "";
            }}
          />
          <span className="muted dropzone-hint">Up to {formatBytes(MAX_FILE_BYTES)} each. Programs (.exe, .msi, …) aren’t allowed.</span>
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
              placeholder="Search by file name or person…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Search files"
            />
            <div className="chips scroll" role="group" aria-label="File type">
              <button className={`chip${kind === "all" ? " is-active" : ""}`} aria-pressed={kind === "all"} onClick={() => setKind("all")}>
                All · {store.files.length}
              </button>
              {active.map((k) => (
                <button key={k.id} className={`chip${kind === k.id ? " is-active" : ""}`} aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
                  {k.label} · {counts.get(k.id)}
                </button>
              ))}
            </div>
          </div>

          <p className="muted result-count" role="status">
            {shown.length === store.files.length
              ? `${store.files.length} file${store.files.length === 1 ? "" : "s"} · ${formatBytes(totalSize)} in total`
              : `${shown.length} of ${store.files.length} files`}
          </p>

          {shown.length === 0 ? (
            <p className="muted">No files match that.</p>
          ) : (
            <div className="file-grid">
              {shown.map((f) => (
                <FileCard key={f.id} file={f} store={store} />
              ))}
            </div>
          )}
        </>
      )}
    </>
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
