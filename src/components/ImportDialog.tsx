"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_LIST, MAX_FOLDER_NAME, sameName, validateFolderName } from "@/lib/folders";
import { MAX_IMPORT, parseRepoList } from "@/lib/parse-repos";
import type { Repo } from "@/lib/types";
import { useBookmarks } from "./BookmarksProvider";
import { CheckIcon } from "./Icons";

const NEW = "__new__";
const CHUNK = 40;

type Result = { added: number; already: number; missing: string[]; failed: string[]; folder: string };

// Library > Import repos: paste GitHub links or owner/name (or upload a CSV) and save them all to a folder.
export function ImportDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { folders, saveMany } = useBookmarks();
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [dest, setDest] = useState(NEW);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  // No cleanup: removing the dialog closes it (see FolderPicker for why).
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const found = useMemo(() => parseRepoList(text), [text]);
  const usable = found.slice(0, MAX_IMPORT);

  async function readFile(file: File) {
    try {
      const body = await file.text();
      setText((t) => (t.trim() ? `${t.trim()}\n${body}` : body));
      setResult(null);
      setError(null);
    } catch {
      setError("Couldn’t read that file.");
    }
  }

  async function run() {
    setError(null);
    setResult(null);
    const folderName = dest === NEW ? newName.trim() : dest;
    if (dest === NEW) {
      const err = validateFolderName(newName, folders);
      if (err) return setError(err);
    }
    if (usable.length === 0) return setError("Paste at least one GitHub link or owner/name first.");

    setBusy(true);
    setProgress(0);
    const got: Repo[] = [];
    const missing: string[] = [];
    const failed: string[] = [];

    for (let i = 0; i < usable.length; i += CHUNK) {
      const chunk = usable.slice(i, i + CHUNK);
      try {
        const res = await fetch("/api/repos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names: chunk }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Lookup failed.");
        got.push(...(data.repos as Repo[]));
        missing.push(...(data.missing as string[]));
        failed.push(...(data.failed as string[]));
      } catch {
        failed.push(...chunk);
      }
      setProgress(Math.min(usable.length, i + CHUNK));
    }

    // New repos are saved; ones you already had are also added to this folder. The rest were already in it.
    const { created, linked } = got.length > 0 ? await saveMany(got, folderName) : { created: 0, linked: 0 };
    const added = created + linked;
    const already = got.length - added;

    // Anything we couldn't check stays in the box, so Import can simply be pressed again.
    setText(failed.join("\n"));
    setResult({ added, already, missing, failed, folder: folderName });
    setBusy(false);
  }

  return (
    <dialog
      ref={ref}
      className="folder-dialog import-dialog"
      aria-label="Import repos from a list"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && !busy && onClose()}
    >
      <div className="folder-dialog-body">
        <div className="section-head">
          <h2>Import repos from a list</h2>
          <button className="link-btn" onClick={onClose} disabled={busy}>Close</button>
        </div>
        <p className="muted import-help">
          Paste GitHub links or <code>owner/name</code>, one per line. A spreadsheet export (CSV) works too. Up to {MAX_IMPORT} at a time.
        </p>

        <textarea
          className="import-text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
          placeholder={"https://github.com/vercel/next.js\nfacebook/react\npmndrs/zustand"}
          rows={8}
          maxLength={500000}
          aria-label="Repos to import"
          spellCheck={false}
          disabled={busy}
        />

        <div className="import-row">
          <button className="btn" type="button" onClick={() => fileRef.current?.click()} disabled={busy}>Upload CSV or text file</button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,.tsv,text/csv,text/plain"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void readFile(f);
              e.target.value = "";
            }}
          />
          <span className="muted import-count" role="status">
            {found.length === 0
              ? "No repos found yet"
              : `Found ${found.length} repo${found.length === 1 ? "" : "s"}${found.length > MAX_IMPORT ? ` (importing the first ${MAX_IMPORT})` : ""}`}
          </span>
        </div>

        <div className="import-dest">
          <label htmlFor="import-folder">Save into</label>
          <select id="import-folder" value={dest} onChange={(e) => setDest(e.target.value)} disabled={busy}>
            <option value={NEW}>New folder…</option>
            {folders.map((f) => (
              <option key={f} value={f}>{f}{sameName(f, DEFAULT_LIST) ? " (default)" : ""}</option>
            ))}
          </select>
          {dest === NEW && (
            <input
              value={newName}
              maxLength={MAX_FOLDER_NAME}
              onChange={(e) => {
                setNewName(e.target.value);
                setError(null);
              }}
              placeholder="Folder name, e.g. Claude skills"
              aria-label="New folder name"
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
            />
          )}
        </div>

        <button className="btn primary wide" onClick={run} disabled={busy || usable.length === 0}>
          {busy ? `Looking up repos… ${progress}/${usable.length}` : usable.length === 0 ? "Import" : `Import ${usable.length} repo${usable.length === 1 ? "" : "s"}`}
        </button>

        {error && <p className="error" role="alert" style={{ margin: 0 }}>{error}</p>}

        {result && (
          <div className="import-result" role="status">
            <p style={{ margin: 0 }}>
              <CheckIcon size={16} /> <strong>{result.added} repo{result.added === 1 ? "" : "s"}</strong> saved to “{result.folder}”.
              {result.already > 0 && ` ${result.already} ${result.already === 1 ? "was" : "were"} already in this folder.`}
            </p>
            {result.missing.length > 0 && (
              <p className="muted" style={{ margin: "6px 0 0" }}>
                {result.missing.length} not found on GitHub: <span translate="no">{result.missing.slice(0, 8).join(", ")}{result.missing.length > 8 ? "…" : ""}</span>
              </p>
            )}
            {result.failed.length > 0 && (
              <p className="muted" style={{ margin: "6px 0 0" }}>
                {result.failed.length} couldn’t be checked (GitHub is limiting requests). They’re still in the box above, so wait a minute and press Import again.
              </p>
            )}
            {result.folder && result.added + result.already > 0 && (
              <button
                className="btn"
                style={{ marginTop: 10 }}
                onClick={() => {
                  onClose();
                  router.push(`/library?folder=${encodeURIComponent(result.folder)}`);
                }}
              >
                Open “{result.folder}”
              </button>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}
