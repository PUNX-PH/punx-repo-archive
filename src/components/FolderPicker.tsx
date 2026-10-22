"use client";

import { useEffect, useRef, useState } from "react";
import { FOLDER_SUGGESTIONS, MAX_FOLDER_NAME, sameName, validateFolderName } from "@/lib/folders";

type Props = {
  repoName: string;
  folders: string[];
  current: string;
  onPick: (folder: string) => void;
  onCreate: (name: string) => Promise<string | null>;
  onClose: () => void;
};

// A modal for choosing (or creating) the folder a saved repo lives in.
export function FolderPicker({ repoName, folders, current, onPick, onCreate, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);

  async function create(value: string) {
    const err = validateFolderName(value, folders);
    if (err) return setError(err);
    const made = await onCreate(value.trim());
    if (made) onPick(made);
  }

  const suggestions = folders.length <= 3 ? FOLDER_SUGGESTIONS.filter((s) => !folders.some((f) => sameName(f, s))) : [];

  return (
    <dialog ref={ref} className="folder-dialog" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-label={`Choose a folder for ${repoName}`}>
      <div className="folder-dialog-body">
        <div className="section-head">
          <h2>Save to folder</h2>
          <button className="link-btn" onClick={onClose}>Done</button>
        </div>
        <p className="muted folder-dialog-sub">{repoName}</p>

        <ul className="folder-options">
          {folders.map((f) => (
            <li key={f}>
              <button className={`folder-option${sameName(f, current) ? " is-current" : ""}`} onClick={() => onPick(f)} aria-pressed={sameName(f, current)}>
                <FolderIcon />
                <span>{f}</span>
                {sameName(f, current) && <span aria-hidden="true">✓</span>}
              </button>
            </li>
          ))}
        </ul>

        {suggestions.length > 0 && (
          <div className="chips">
            {suggestions.map((s) => (
              <button key={s} className="chip chip-sm" onClick={() => create(s)}>+ {s}</button>
            ))}
          </div>
        )}

        <form
          className="folder-new"
          onSubmit={(e) => {
            e.preventDefault();
            create(name);
          }}
        >
          <input
            value={name}
            maxLength={MAX_FOLDER_NAME}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="New folder, e.g. Java"
            aria-label="New folder name"
            aria-invalid={Boolean(error)}
          />
          <button className="btn" type="submit">Create</button>
        </form>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </dialog>
  );
}

export function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  );
}
