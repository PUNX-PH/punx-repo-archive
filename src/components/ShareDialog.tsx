"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, ShareIcon } from "./Icons";
import { ViewCount } from "./Views";
import { shareStatKey } from "@/lib/views";
import type { Share } from "@/lib/types";

type Props = {
  folder: string;
  repoCount: number;
  share: Share | undefined;
  canShare: boolean;
  onCreate: () => Promise<Share | null>;
  onStop: () => Promise<void>;
  onClose: () => void;
};

const linkFor = (id: string) => `${window.location.origin}/shared/${id}`;

// One place to share a folder: make the link, copy it, send it, see views, or turn it off.
export function ShareDialog({ folder, repoCount, share, canShare, onCreate, onStop, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No cleanup: removing the dialog from the page closes it. Calling close() here fires a 'close' event
  // that would tell the parent to unmount us again (it does, in React's dev double-render).
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: the link stays selectable in the box.
    }
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const s = await onCreate();
      if (s) await copy(linkFor(s.id));
    } catch {
      setError("Couldn’t create the link. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    setError(null);
    try {
      await onStop();
      setConfirmStop(false);
    } catch {
      setError("Couldn’t stop sharing. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  const url = share ? linkFor(share.id) : "";
  const message = `Here’s my “${folder}” folder of repos on Punx Repo Archive: ${url}`;
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <dialog
      ref={ref}
      className="folder-dialog share-dialog"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={`Share ${folder}`}
    >
      <div className="folder-dialog-body">
        <div className="section-head">
          <h2>Share “{folder}”</h2>
          <button className="link-btn" onClick={onClose}>Done</button>
        </div>

        {!canShare ? (
          <p className="muted">
            <Link href="/profile">Sign in</Link> with your @punx.ai account to share folders with a link.
          </p>
        ) : repoCount === 0 && !share ? (
          <p className="muted">This folder is empty. Add a repo to it first, then come back to share it.</p>
        ) : !share ? (
          <>
            <p className="muted" style={{ margin: 0 }}>
              Make a link that anyone on the Punx team can open. They can browse the {repoCount} repo{repoCount === 1 ? "" : "s"} and save a copy to their own library. It stays up to date as you change the folder.
            </p>
            <button className="btn primary wide" onClick={create} disabled={busy}>
              <ShareIcon /> {busy ? "Creating link…" : "Create link"}
            </button>
          </>
        ) : (
          <>
            <div className="share-link">
              <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label={`Link to ${folder}`} spellCheck={false} />
              <button className="btn primary" onClick={() => copy(url)}>
                {copied ? <><CheckIcon size={16} /> Copied</> : "Copy link"}
              </button>
            </div>

            <div className="share-targets" aria-label="Send the link">
              <a className="btn" href={`viber://forward?text=${encodeURIComponent(message)}`}>Viber</a>
              <a className="btn" href={`mailto:?subject=${encodeURIComponent(`${folder} on Punx Repo Archive`)}&body=${encodeURIComponent(message)}`}>Email</a>
              {canNativeShare && (
                <button className="btn" onClick={() => navigator.share({ title: `${folder} on Punx Repo Archive`, url }).catch(() => {})}>
                  More…
                </button>
              )}
            </div>

            <p className="muted share-note" style={{ margin: 0 }}>
              <strong><ViewCount statKey={shareStatKey(share.id)} /></strong>{" "}
              Only people signed in with a @punx.ai account can open it, and it updates when you change the folder.
              {repoCount > 200 && " Only the first 200 repos are shared."}
            </p>

            <div className="share-stop">
              {confirmStop ? (
                <>
                  <span className="muted">The link stops working for everyone who has it.</span>
                  <button className="btn danger" onClick={stop} disabled={busy}>Stop sharing</button>
                  <button className="btn" onClick={() => setConfirmStop(false)}>Keep sharing</button>
                </>
              ) : (
                <button className="link-btn" onClick={() => setConfirmStop(true)}>Stop sharing</button>
              )}
            </div>
          </>
        )}

        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </dialog>
  );
}
