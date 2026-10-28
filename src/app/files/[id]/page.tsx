"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CheckIcon, LinkIcon } from "@/components/Icons";
import { copyText, fileLink, publicLink } from "@/lib/copy";
import { PREVIEW_MODE } from "@/lib/domain";
import { accessSummary, roleOn } from "@/lib/file-share";
import { db, storage } from "@/lib/firebase";
import { extOf, formatBytes, formatWhen, kindOf, sharingOf, type ArchiveFile } from "@/lib/files";
import { previewFiles } from "@/lib/preview-files";

type Loaded = { status: "loading" } | { status: "denied" } | { status: "ready"; file: ArchiveFile };

// One file on its own page, the way a Google Drive link works: anyone with access who opens the link sees it here.
export default function FilePage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const [state, setState] = useState<Loaded>({ status: "loading" });
  const [url, setUrl] = useState<string | null>(null);
  const [urlFailed, setUrlFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (loading) return;
    setState({ status: "loading" });
    if (!user || !db) {
      const p = PREVIEW_MODE ? previewFiles.get(id) : undefined;
      setState(p ? { status: "ready", file: p.file } : { status: "denied" });
      return;
    }
    // A missing file and one you can't open look the same on purpose: Firestore doesn't say which.
    return onSnapshot(
      doc(db, "files", id),
      (snap) => setState(snap.exists() ? { status: "ready", file: { ...(snap.data() as Omit<ArchiveFile, "id">), id: snap.id } } : { status: "denied" }),
      () => setState({ status: "denied" }),
    );
  }, [id, user, loading]);

  const file = state.status === "ready" ? state.file : null;
  const path = file?.path;

  useEffect(() => {
    setUrl(null);
    setUrlFailed(false);
    if (!file) return;
    const preview = previewFiles.get(file.id);
    if (preview) return setUrl(preview.url);
    if (!storage) return setUrlFailed(true);
    let live = true;
    getDownloadURL(ref(storage, file.path)).then(
      (u) => live && setUrl(u),
      () => live && setUrlFailed(true),
    );
    return () => {
      live = false;
    };
    // Only the storage path matters; renaming or resharing shouldn't reload the preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => {
    if (file) document.title = `${file.name} · Punx Repo Archive`;
  }, [file]);

  async function copy() {
    if (file && (await copyText(fileLink(window.location.origin, file)))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  }

  if (state.status === "loading") {
    return (
      <>
        <p className="eyebrow"><Link href="/files">← All files</Link></p>
        <div className="skeleton" style={{ height: 28, width: "60%" }} aria-busy="true" />
        <div className="skeleton" style={{ height: 320, marginTop: 16 }} />
      </>
    );
  }

  if (!file) {
    return (
      <>
        <p className="eyebrow"><Link href="/files">← All files</Link></p>
        <div className="notice error-box" role="alert">
          <strong>You can’t open this file</strong>
          <span>It may have been deleted, or it hasn’t been shared with {user?.email ?? "your account"}. Ask the owner to share it with you, then open the link again.</span>
          <Link className="btn" href="/files">Go to Files</Link>
        </div>
      </>
    );
  }

  const kind = kindOf(file.name, file.contentType);
  const role = roleOn(
    { ownerUid: file.uploaderUid, editors: file.editors },
    user ? { uid: user.uid, email: user.email ?? "" } : PREVIEW_MODE ? { uid: "preview", email: "" } : null,
  );
  const access = accessSummary(sharingOf(file));
  const ext = extOf(file.name);

  return (
    <article className="viewer">
      <p className="eyebrow"><Link href="/files">← All files</Link></p>
      <div className="viewer-head">
        <span className="file-badge" data-kind={kind}>{(ext || kind).slice(0, 5)}</span>
        <div className="viewer-title">
          <h1>{file.name}</h1>
          <p className="muted">
            {formatBytes(file.size)} · {role === "owner" ? "You" : file.uploaderName} · {formatWhen(file.createdAt)} ·{" "}
            {role === "owner" ? access.label : role === "editor" ? "You can edit" : "View only"}
          </p>
        </div>
      </div>

      <div className="viewer-actions">
        {url && (
          <a className="btn primary" href={url} target="_blank" rel="noopener noreferrer">Open original</a>
        )}
        <button className="btn" onClick={copy}>{copied ? <><CheckIcon size={16} /> Link copied</> : <><LinkIcon size={16} /> Copy link</>}</button>
        {file.public && kind === "web" && (
          <a className="btn" href={publicLink(window.location.origin, file.id)} target="_blank" rel="noopener noreferrer">Open public page</a>
        )}
        {role === "owner" && (
          <Link className="btn" href={`/files?open=${file.id}`}>Manage sharing</Link>
        )}
      </div>

      <div className="viewer-stage">
        {urlFailed ? (
          <p className="muted viewer-note">Couldn’t load a preview. Try Open original.</p>
        ) : !url ? (
          <div className="skeleton viewer-skel" aria-busy="true" />
        ) : kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="viewer-image" src={url} alt={file.name} />
        ) : kind === "pdf" ? (
          <iframe className="viewer-frame" src={url} title={file.name} />
        ) : kind === "web" ? (
          <>
            {/* No same-origin access: the page can run its own scripts but can't reach this app or your sign-in. */}
            <iframe className="viewer-frame" src={url} title={file.name} sandbox="allow-scripts allow-popups" referrerPolicy="no-referrer" />
            <p className="muted viewer-note">Shown in a protected frame. Some pages need “Open original” to work fully.</p>
          </>
        ) : kind === "media" && file.contentType.startsWith("video/") ? (
          <video className="viewer-media" src={url} controls />
        ) : kind === "media" && file.contentType.startsWith("audio/") ? (
          <audio className="viewer-audio" src={url} controls />
        ) : (
          <div className="viewer-nopreview">
            <span className="file-badge" data-kind={kind}>{(ext || kind).slice(0, 5)}</span>
            <p className="muted">There’s no preview for this type of file. Use Open original to download or open it.</p>
          </div>
        )}
      </div>
    </article>
  );
}
