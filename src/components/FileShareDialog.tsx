"use client";

import { useEffect, useRef, useState } from "react";
import { ALLOWED_DOMAIN } from "@/lib/domain";
import { MAX_PEOPLE, normEmail, validatePerson, type Access, type Role, type Sharing } from "@/lib/file-share";
import { CheckIcon } from "./Icons";

export type ShareTarget = {
  kind: "file" | "folder";
  name: string;
  ownerName: string;
  ownerEmail: string;
  sharing: Sharing;
};

type Props = {
  target: ShareTarget;
  /** Only the owner can change who has access. */
  canManage: boolean;
  /** The link people can open (it only works for people who have access). */
  link: string;
  onChange: (next: Sharing) => Promise<void>;
  onClose: () => void;
};

const ROLES: { id: Role; label: string }[] = [
  { id: "viewer", label: "Viewer" },
  { id: "editor", label: "Editor" },
];

// Google Drive-style sharing: add people by email with a role, and choose who else can open it with the link.
export function FileShareDialog({ target, canManage, link, onChange, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [sharing, setSharing] = useState(target.sharing);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // No cleanup: removing the dialog closes it (see FolderPicker for why).
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  // Follow changes that arrive from the server, without clobbering an edit that is still being saved.
  const incoming = JSON.stringify(target.sharing);
  useEffect(() => {
    if (!saving) setSharing(JSON.parse(incoming) as Sharing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  async function apply(next: Sharing) {
    const before = sharing;
    setSharing(next);
    setSaving(true);
    setError(null);
    try {
      await onChange(next);
    } catch {
      setSharing(before);
      setError("Couldn’t save that change. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const err = validatePerson(email, sharing.people, target.ownerEmail);
    if (err) return setError(err);
    await apply({ ...sharing, people: [...sharing.people, { email: normEmail(email), role }] });
    setEmail("");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setError("Couldn’t copy automatically. Select and copy the link from the address bar after opening it.");
    }
  }

  const noun = target.kind === "folder" ? "folder" : "file";

  return (
    <dialog
      ref={ref}
      className="folder-dialog share-dialog"
      aria-label={`Share ${target.name}`}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <div className="folder-dialog-body">
        <div className="section-head">
          <h2>Share “{target.name}”</h2>
          <button className="link-btn" onClick={onClose}>Close</button>
        </div>
        {target.kind === "folder" && (
          <p className="muted folder-dialog-sub">Everyone who can open this folder can open everything inside it.</p>
        )}

        {canManage && (
          <form className="share-add" onSubmit={add}>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder={`Add people with @${ALLOWED_DOMAIN} emails`}
              aria-label="Email address to share with"
              aria-invalid={Boolean(error)}
              autoComplete="off"
              spellCheck={false}
              disabled={saving}
            />
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} aria-label="Their access" disabled={saving}>
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
            <button className="btn primary" type="submit" disabled={saving || !email.trim()}>Add</button>
          </form>
        )}
        {error && <p className="error share-error" role="alert">{error}</p>}

        <h3 className="share-h">People with access</h3>
        <ul className="share-people">
          <li>
            <span className="share-avatar" aria-hidden="true">{(target.ownerName || target.ownerEmail).charAt(0).toUpperCase()}</span>
            <span className="share-who">
              <strong>{target.ownerName || target.ownerEmail}</strong>
              {target.ownerEmail && <small>{target.ownerEmail}</small>}
            </span>
            <span className="muted share-role">Owner</span>
          </li>
          {sharing.people.map((p) => (
            <li key={p.email}>
              <span className="share-avatar" aria-hidden="true">{p.email.charAt(0).toUpperCase()}</span>
              <span className="share-who">
                <strong>{p.email}</strong>
              </span>
              {canManage ? (
                <select
                  className="share-role-select"
                  value={p.role}
                  aria-label={`Access for ${p.email}`}
                  disabled={saving}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "remove") void apply({ ...sharing, people: sharing.people.filter((x) => x.email !== p.email) });
                    else void apply({ ...sharing, people: sharing.people.map((x) => (x.email === p.email ? { ...x, role: v as Role } : x)) });
                  }}
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                  <option value="remove">Remove access</option>
                </select>
              ) : (
                <span className="muted share-role">{p.role === "editor" ? "Editor" : "Viewer"}</span>
              )}
            </li>
          ))}
        </ul>
        {sharing.people.length >= MAX_PEOPLE && canManage && (
          <p className="muted share-note">That’s the limit of {MAX_PEOPLE} people. Use “Anyone at {ALLOWED_DOMAIN}” to reach more.</p>
        )}

        <h3 className="share-h">General access</h3>
        {canManage ? (
          <select
            value={sharing.access}
            onChange={(e) => void apply({ ...sharing, access: e.target.value as Access })}
            aria-label="General access"
            disabled={saving}
          >
            <option value="restricted">Restricted</option>
            <option value="domain">Anyone at {ALLOWED_DOMAIN} with the link</option>
          </select>
        ) : (
          <strong>{sharing.access === "domain" ? `Anyone at ${ALLOWED_DOMAIN} with the link` : "Restricted"}</strong>
        )}
        <p className="muted share-note">
          {sharing.access === "domain"
            ? `Anyone signed in with an @${ALLOWED_DOMAIN} account can view this ${noun}.`
            : `Only the owner and the people above can open this ${noun}.`}
        </p>

        <div className="share-foot">
          <button className="btn" onClick={copy}>{copied ? <><CheckIcon size={16} /> Link copied</> : "Copy link"}</button>
          <button className="btn primary" onClick={onClose}>Done</button>
        </div>
        <p className="muted share-note" role="status">{saving ? "Saving…" : ""}</p>
      </div>
    </dialog>
  );
}
