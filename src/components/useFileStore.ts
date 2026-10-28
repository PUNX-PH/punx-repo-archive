"use client";

import {
  collection, deleteDoc, deleteField, doc, onSnapshot, query, setDoc, updateDoc, where, writeBatch,
  type DocumentData, type Query, type Unsubscribe,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PREVIEW_MODE } from "@/lib/domain";
import { db, storage } from "@/lib/firebase";
import { PRIVATE, grantsFor, normEmail, roleOn, type Grants, type MyRole, type Sharing, type Who } from "@/lib/file-share";
import { folderIdOf, kindOf, newFileId, sharingOf, storageName, type ArchiveFile, type FolderItem } from "@/lib/files";
import { previewFiles } from "@/lib/preview-files";
import { useAuth } from "./AuthProvider";

export type FileStore = {
  /** Everything this person can see: their own files, files shared with them and files shared with all of punx.ai. */
  files: ArchiveFile[];
  /** Folders they can see, A to Z. */
  folders: FolderItem[];
  ready: boolean;
  /** Why files can't be used at all (storage not set up, or loading failed). */
  problem: string | null;
  /** True in the local preview, where files only live until the page is closed. */
  temporary: boolean;
  me: Who | null;
  roleOnFile: (file: ArchiveFile) => MyRole;
  roleOnFolder: (folder: FolderItem) => MyRole;
  /** `folderId` is where the file goes; empty means no folder. New files are private to their owner. */
  upload: (file: File, folderId: string, onProgress: (fraction: number) => void) => Promise<void>;
  /** Owner only. */
  remove: (file: ArchiveFile) => Promise<void>;
  /** Owner or editor. */
  rename: (file: ArchiveFile, name: string) => Promise<void>;
  /** Owner only. The target folder must be one they own or can edit. */
  move: (file: ArchiveFile, folderId: string) => Promise<void>;
  createFolder: (name: string) => Promise<string>;
  renameFolder: (folderId: string, name: string) => Promise<void>;
  /** Owner only. Files inside stay in the archive, outside any folder. */
  deleteFolder: (folderId: string) => Promise<void>;
  shareFile: (file: ArchiveFile, sharing: Sharing) => Promise<void>;
  /** Sharing a folder shares everything in it. */
  shareFolder: (folder: FolderItem, sharing: Sharing) => Promise<void>;
  /** A link that opens or downloads the file. Resolved on demand because it needs a round trip to Storage. */
  urlFor: (file: ArchiveFile) => Promise<string>;
};

const BATCH = 400;
// Legacy folders (before sharing existed) used their lowercase name as the document id.
const legacyFolderId = (name: string) => encodeURIComponent(name.trim().toLowerCase());
const byName = (a: FolderItem, b: FolderItem) => a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });

function toFolder(id: string, d: DocumentData): FolderItem {
  return {
    id,
    name: String(d.name ?? ""),
    ownerUid: String(d.ownerUid ?? d.createdBy ?? ""),
    ownerName: String(d.ownerName ?? ""),
    ownerEmail: String(d.ownerEmail ?? ""),
    createdAt: Number(d.createdAt ?? 0),
    // Folders made before sharing existed were visible to the whole team.
    access: d.access ?? "domain",
    people: d.people ?? [],
    domain: d.domain ?? true,
    viewers: d.viewers ?? [],
    editors: d.editors ?? [],
  };
}

/** Merges the results of several queries into one list, newest query result winning on duplicates. */
function mergeParts<T extends { id: string }>(parts: Map<string, T>[]): T[] {
  const out = new Map<string, T>();
  parts.forEach((p) => p.forEach((v, k) => out.set(k, v)));
  return [...out.values()];
}

// Signed in: files are the Firestore `files` collection, the bytes are in Firebase Storage, folders are `fileFolders`.
// Each person only gets documents their own queries match: ones they own, ones shared with their email, and ones shared
// with everyone at punx.ai. Local preview (no sign-in): everything stays in memory so the screen can be tried without a bucket.
export function useFileStore(): FileStore {
  const { user, loading } = useAuth();
  const cloud = Boolean(user && db && storage);
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [folderList, setFolderList] = useState<FolderItem[]>([]);
  const [ready, setReady] = useState(false);
  const [foldersReady, setFoldersReady] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const local = useRef(new Map<string, string>());
  const legacy = useRef(new Set<string>());

  const me = useMemo<Who | null>(
    () => (user ? { uid: user.uid, email: normEmail(user.email ?? "") } : PREVIEW_MODE ? { uid: "preview", email: "preview@punx.ai" } : null),
    [user],
  );

  const folders = useMemo(() => [...folderList].sort(byName), [folderList]);
  // Read through refs inside callbacks so they always see the latest data without re-creating on every snapshot.
  const filesRef = useRef(files);
  filesRef.current = files;
  const foldersRef = useRef(folders);
  foldersRef.current = folders;

  useEffect(() => {
    if (loading) return;
    setProblem(null);

    if (!user) {
      setFiles([]);
      setFolderList([]);
      setReady(true);
      setFoldersReady(true);
      return;
    }
    if (!db || !storage) {
      setProblem("File storage isn’t set up for this site yet.");
      setReady(true);
      return;
    }

    setReady(false);
    setFoldersReady(false);
    const uid = user.uid;
    const email = normEmail(user.email ?? "");
    const database = db;
    const offs: Unsubscribe[] = [];

    // One listener per way a document can reach this person. Each query matches exactly one clause of the rules.
    const watch = <T extends { id: string }>(
      queries: Query[],
      map: (id: string, d: DocumentData) => T,
      publish: (items: T[]) => void,
      onFirst: () => void,
      fail: () => void,
    ) => {
      const parts = queries.map(() => new Map<string, T>());
      const seen = new Set<number>();
      queries.forEach((q, i) => {
        offs.push(
          onSnapshot(
            q,
            (snap) => {
              parts[i] = new Map(snap.docs.map((d) => [d.id, map(d.id, d.data())]));
              publish(mergeParts(parts));
              // The first query is "mine"; once it answers there is something to show.
              seen.add(i);
              if (seen.has(0)) onFirst();
            },
            () => {
              // The first query is the one that must work; the others only add shared items.
              if (i === 0) fail();
            },
          ),
        );
      });
    };

    const filesCol = collection(database, "files");
    const foldersCol = collection(database, "fileFolders");
    const loadFail = () => {
      setProblem("Couldn’t load the archive. Check your connection and reload.");
      setReady(true);
      setFoldersReady(true);
    };

    watch<ArchiveFile>(
      [query(filesCol, where("uploaderUid", "==", uid)), query(filesCol, where("domain", "==", true)), query(filesCol, where("viewers", "array-contains", email))],
      // The type is worked out here, so files archived before a type existed (like HTML) are sorted into it too.
      (id, d) => ({ ...(d as Omit<ArchiveFile, "id">), id, kind: kindOf(String(d.name ?? ""), String(d.contentType ?? "")) }),
      setFiles,
      () => setReady(true),
      loadFail,
    );
    watch<FolderItem>(
      [
        query(foldersCol, where("ownerUid", "==", uid)),
        query(foldersCol, where("createdBy", "==", uid)),
        query(foldersCol, where("domain", "==", true)),
        query(foldersCol, where("viewers", "array-contains", email)),
      ],
      (id, d) => {
        if (d.ownerUid === undefined) legacy.current.add(id);
        else legacy.current.delete(id);
        return toFolder(id, d);
      },
      setFolderList,
      () => setFoldersReady(true),
      loadFail,
    );

    return () => offs.forEach((off) => off());
  }, [user, loading]);

  // Files and folders from before sharing existed were visible to the whole team. Their owner moves them to the new
  // fields once, keeping that visibility, so nothing disappears for anyone.
  const attempted = useRef(new Set<string>());
  useEffect(() => {
    if (!cloud || !db || !user || !ready || !foldersReady) return;
    const database = db;
    const mine = me!;
    // Each item is tried once per page load, so a failure can't loop.
    const fresh = (kind: string, id: string) => !attempted.current.has(`${kind}:${id}`) && Boolean(attempted.current.add(`${kind}:${id}`));
    const mineFolders = folders.filter((f) => f.ownerUid === mine.uid && legacy.current.has(f.id) && fresh("folder", f.id));
    const mineFiles = files.filter((f) => f.uploaderUid === mine.uid && f.domain === undefined && fresh("file", f.id));
    if (mineFolders.length === 0 && mineFiles.length === 0) return;

    void (async () => {
      const open: Sharing = { access: "domain", people: [] };
      for (const f of mineFolders) {
        await updateDoc(doc(database, "fileFolders", f.id), {
          ownerUid: mine.uid, ownerName: user.displayName ?? user.email ?? "", ownerEmail: mine.email,
          access: "domain", people: [], domain: true, viewers: [], editors: [],
        }).catch(() => {});
      }
      for (const f of mineFiles) {
        const wanted = f.folder?.trim() ? legacyFolderId(f.folder) : "";
        const parent = folders.find((x) => x.id === wanted);
        const withFolder = { sharing: sharingOf(parent ?? PRIVATE), ownerEmail: parent?.ownerEmail ?? "" };
        const base = { access: "domain", people: [], uploaderEmail: mine.email, folder: deleteField() };
        const tryWrite = (folderId: string, g: Grants) =>
          updateDoc(doc(database, "files", f.id), { ...base, folderId, domain: g.domain, viewers: g.viewers, editors: g.editors });
        await tryWrite(wanted, grantsFor(open, parent ? withFolder : null)).catch(() => tryWrite("", grantsFor(open)).catch(() => {}));
      }
    })();
  }, [cloud, user, me, ready, foldersReady, files, folders]);

  const folderById = (id: string) => foldersRef.current.find((f) => f.id === id);
  const grantsInFolder = (own: Sharing, folderId: string): Grants => {
    const parent = folderId ? folderById(folderId) : undefined;
    return grantsFor(own, parent ? { sharing: sharingOf(parent), ownerEmail: parent.ownerEmail } : null);
  };

  const roleOnFile = useCallback((f: ArchiveFile) => roleOn({ ownerUid: f.uploaderUid, editors: f.editors }, me), [me]);
  const roleOnFolder = useCallback((f: FolderItem) => roleOn({ ownerUid: f.ownerUid, editors: f.editors }, me), [me]);

  const patchFile = (id: string, p: Partial<ArchiveFile>) => setFiles((all) => all.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const patchFolder = (id: string, p: Partial<FolderItem>) => setFolderList((all) => all.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const upload = useCallback<FileStore["upload"]>(
    async (file, folderId, onProgress) => {
      const contentType = file.type || "application/octet-stream";
      const id = newFileId();
      const target = folderId ? folderById(folderId) : undefined;
      if (folderId && (!target || roleOnFolder(target) === "viewer")) throw new Error("You can’t add files to that folder.");
      const grants = grantsInFolder(PRIVATE, folderId);
      const common = { name: file.name, size: file.size, contentType, kind: kindOf(file.name, contentType), createdAt: Date.now(), folderId, access: PRIVATE.access, people: PRIVATE.people, ...grants };

      if (!user || !db || !storage) {
        if (!PREVIEW_MODE) throw new Error("Sign in to upload files.");
        const url = URL.createObjectURL(file);
        local.current.set(id, url);
        const made: ArchiveFile = { id, path: id, uploaderUid: "preview", uploaderName: "You", uploaderEmail: "preview@punx.ai", ...common };
        previewFiles.set(id, { file: made, url });
        setFiles((f) => [made, ...f]);
        onProgress(1);
        return;
      }

      const path = `files/${user.uid}/${id}/${storageName(file.name)}`;
      const objectRef = ref(storage, path);
      await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(objectRef, file, { contentType });
        task.on("state_changed", (s) => onProgress(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0), reject, () => resolve());
      });

      try {
        await setDoc(doc(db, "files", id), {
          ...common,
          path,
          uploaderUid: user.uid,
          uploaderName: user.displayName ?? user.email ?? "Someone",
          uploaderEmail: normEmail(user.email ?? ""),
        });
      } catch (e) {
        // Don't leave bytes behind that nothing points to.
        await deleteObject(objectRef).catch(() => {});
        throw e;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, roleOnFolder],
  );

  const remove = useCallback<FileStore["remove"]>(
    async (file) => {
      if (!db || !storage || !user) {
        const url = local.current.get(file.id);
        if (url) URL.revokeObjectURL(url);
        local.current.delete(file.id);
        previewFiles.delete(file.id);
        setFiles((f) => f.filter((x) => x.id !== file.id));
        return;
      }
      // Bytes first: if this fails nothing is lost, and a file that's already gone is fine.
      await deleteObject(ref(storage, file.path)).catch((e) => {
        if ((e as { code?: string }).code !== "storage/object-not-found") throw e;
      });
      await deleteDoc(doc(db, "files", file.id));
    },
    [user],
  );

  const rename = useCallback<FileStore["rename"]>(
    async (file, name) => {
      if (!db || !user) return patchFile(file.id, { name });
      await updateDoc(doc(db, "files", file.id), { name });
    },
    [user],
  );

  const move = useCallback<FileStore["move"]>(
    async (file, folderId) => {
      const g = grantsInFolder(sharingOf(file), folderId);
      if (!db || !user) return patchFile(file.id, { folderId, ...g });
      await updateDoc(doc(db, "files", file.id), { folderId, domain: g.domain, viewers: g.viewers, editors: g.editors });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user],
  );

  const createFolder = useCallback<FileStore["createFolder"]>(
    async (name) => {
      const id = newFileId();
      const mine = me!;
      const data: Omit<FolderItem, "id"> = {
        name: name.trim(), ownerUid: mine.uid, ownerName: user?.displayName ?? user?.email ?? "You", ownerEmail: mine.email,
        createdAt: Date.now(), access: "restricted", people: [], domain: false, viewers: [], editors: [],
      };
      if (!db || !user) {
        setFolderList((f) => [...f, { id, ...data }]);
        return id;
      }
      await setDoc(doc(db, "fileFolders", id), data);
      return id;
    },
    [user, me],
  );

  const renameFolder = useCallback<FileStore["renameFolder"]>(
    async (id, name) => {
      if (!db || !user) return patchFolder(id, { name: name.trim() });
      await updateDoc(doc(db, "fileFolders", id), { name: name.trim() });
    },
    [user],
  );

  // Writes to many files, a batch at a time (Firestore caps a batch at 500 writes). `first` rides in the first batch.
  const batched = useCallback(async (writes: [string, Record<string, unknown>][], first?: (b: ReturnType<typeof writeBatch>) => void, last?: (b: ReturnType<typeof writeBatch>) => void) => {
    if (!db) return;
    const database = db;
    const chunks = Math.max(1, Math.ceil(writes.length / BATCH));
    for (let i = 0; i < chunks; i++) {
      const batch = writeBatch(database);
      writes.slice(i * BATCH, (i + 1) * BATCH).forEach(([id, data]) => batch.update(doc(database, "files", id), data));
      if (i === 0) first?.(batch);
      if (i === chunks - 1) last?.(batch);
      await batch.commit();
    }
  }, []);

  const deleteFolder = useCallback<FileStore["deleteFolder"]>(
    async (id) => {
      const inside = filesRef.current.filter((f) => folderIdOf(f) === id);
      if (!db || !user) {
        setFolderList((f) => f.filter((x) => x.id !== id));
        inside.forEach((f) => patchFile(f.id, { folderId: "", ...grantsFor(sharingOf(f)) }));
        return;
      }
      const database = db;
      const writes: [string, Record<string, unknown>][] = inside.map((f) => {
        const g = grantsFor(sharingOf(f));
        return [f.id, { folderId: "", domain: g.domain, viewers: g.viewers, editors: g.editors }];
      });
      await batched(writes, undefined, (b) => b.delete(doc(database, "fileFolders", id)));
    },
    [user, batched],
  );

  const shareFile = useCallback<FileStore["shareFile"]>(
    async (file, sharing) => {
      const g = grantsInFolder(sharing, folderIdOf(file));
      const next = { access: sharing.access, people: sharing.people, domain: g.domain, viewers: g.viewers, editors: g.editors };
      if (!db || !user) return patchFile(file.id, next);
      await updateDoc(doc(db, "files", file.id), next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user],
  );

  const shareFolder = useCallback<FileStore["shareFolder"]>(
    async (folder, sharing) => {
      const own = grantsFor(sharing);
      const next = { access: sharing.access, people: sharing.people, domain: own.domain, viewers: own.viewers, editors: own.editors };
      const inside = filesRef.current.filter((f) => folderIdOf(f) === folder.id);
      const parent = { sharing, ownerEmail: folder.ownerEmail };
      const effective = (f: ArchiveFile) => grantsFor(sharingOf(f), parent);

      if (!db || !user) {
        patchFolder(folder.id, next);
        inside.forEach((f) => patchFile(f.id, effective(f)));
        return;
      }
      const database = db;
      const writes: [string, Record<string, unknown>][] = inside.map((f) => {
        const g = effective(f);
        return [f.id, { domain: g.domain, viewers: g.viewers, editors: g.editors }];
      });
      await batched(writes, (b) => b.update(doc(database, "fileFolders", folder.id), next));
    },
    [user, batched],
  );

  const urlFor = useCallback<FileStore["urlFor"]>(async (file) => {
    const blob = local.current.get(file.id);
    if (blob) return blob;
    if (!storage) throw new Error("File storage isn’t set up.");
    return getDownloadURL(ref(storage, file.path));
  }, []);

  return useMemo(
    () => ({
      files, folders, ready, problem, temporary: !cloud, me, roleOnFile, roleOnFolder,
      upload, remove, rename, move, createFolder, renameFolder, deleteFolder, shareFile, shareFolder, urlFor,
    }),
    [files, folders, ready, problem, cloud, me, roleOnFile, roleOnFolder, upload, remove, rename, move, createFolder, renameFolder, deleteFolder, shareFile, shareFolder, urlFor],
  );
}
