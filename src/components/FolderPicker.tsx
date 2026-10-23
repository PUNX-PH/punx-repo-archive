"use client";

import { useEffect, useRef, useState } from "react";
import { FOLDER_SUGGESTIONS, MAX_FOLDER_NAME, sameName, validateFolderName } from "@/lib/folders";

type Props = {
  repoName: string;
  folders: string[];
  /** The folders this repo is in now. */
  current: string[];
  onToggle: (folder: string, on: boolean) => void;
  onCreate: (name: string) => Promise<string | null>;
  onClose: () => void;
};

// Choose which folders a saved repo lives in. Tick as many as you like; it stays in at least one.
export function FolderPicker({ repoName, folders, current, onToggle, onCreate, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // No cleanup: removing the dialog from the page closes it. Calling close() here fires a 'close' event
  // that would tell the parent to unmount us again (it does, in React's dev double-render).
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const isIn = (f: string) => current.some((c) => sameName(c, f));
  const onlyOne = current.length <= 1;

  async function create(value: string) {
    const err = validateFolderName(value, folders);
    if (err) return setError(err);
    const made = await onCreate(value.trim());
    if (made) {
      onToggle(made, true);
      setName("");
    }
  }

  const suggestions = folders.length <= 3 ? FOLDER_SUGGESTIONS.filter((s) => !folders.some((f) => sameName(f, s))) : [];

  return (
    <dialog ref={ref} className="folder-dialog" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-label={`Choose folders for ${repoName}`}>
      <div className="folder-dialog-body">
        <div className="section-head">
          <h2>Save to folders</h2>
          <button className="link-btn" onClick={onClose}>Done</button>
        </div>
        <p className="muted folder-dialog-sub" translate="no">{repoName}</p>

        <fieldset className="folder-checks">
          <legend className="sr-only">Folders for {repoName}</legend>
          {folders.map((f) => {
            const checked = isIn(f);
            const locked = checked && onlyOne;
            return (
              <label
                key={f}
                className={`folder-check${checked ? " is-checked" : ""}${locked ? " is-locked" : ""}`}
                title={locked ? "A saved repo stays in at least one folder. Use the bookmark to remove it." : undefined}
              >
                <input type="checkbox" checked={checked} disabled={locked} onChange={(e) => onToggle(f, e.target.checked)} />
                <span className="folder-check-name">{f}</span>
              </label>
            );
          })}
        </fieldset>
        {onlyOne && <p className="muted folder-dialog-hint">It stays in at least one folder. Use the bookmark button to remove it from your library.</p>}

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
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(error)}
          />
          <button className="btn" type="submit">Create and add</button>
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
