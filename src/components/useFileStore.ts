"use client";

import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PREVIEW_MODE } from "@/lib/domain";
import { db, storage } from "@/lib/firebase";
import { folderOf, kindOf, newFileId, storageName, type ArchiveFile } from "@/lib/files";
import { sameName, uniqueFolders } from "@/lib/folders";
import { useAuth } from "./AuthProvider";

export type FileStore = {
  files: ArchiveFile[];
  /** Every team folder, A to Z. Includes empty ones. */
  folders: string[];
  ready: boolean;
  /** Why files can't be used at all (storage not set up, or loading failed). */
  problem: string | null;
  /** True in the local preview, where files only live until the page is closed. */
  temporary: boolean;
  me: string | null;
  /** `folder` is where the file is filed; empty means Unfiled. */
  upload: (file: File, folder: string, onProgress: (fraction: number) => void) => Promise<void>;
  remove: (file: ArchiveFile) => Promise<void>;
  rename: (file: ArchiveFile, name: string) => Promise<void>;
  /** Files a file into a folder (empty string = Unfiled). Any member can do this. */
  move: (file: ArchiveFile, folder: string) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  /** Renames a folder and everything in it. */
  renameFolder: (from: string, to: string) => Promise<void>;
  /** Removes the folder. Its files stay, as Unfiled. */
  deleteFolder: (name: string) => Promise<void>;
  /** A link that opens or downloads the file. Resolved on demand because it needs a round trip to Storage. */
  urlFor: (file: ArchiveFile) => Promise<string>;
};

const folderDocId = (name: string) => encodeURIComponent(name.trim().toLowerCase());
const BATCH = 400;

// Signed in: the list is the Firestore `files` collection, the bytes are in Firebase Storage, folders are `fileFolders`.
// Local preview (no sign-in): everything stays in memory so the screen can be tried without a bucket.
export function useFileStore(): FileStore {
  const { user, loading } = useAuth();
  const cloud = Boolean(user && db && storage);
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [folderDocs, setFolderDocs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const local = useRef(new Map<string, string>());

  useEffect(() => {
    if (loading) return;
    setProblem(null);

    if (!user) {
      setFiles([]);
      setFolderDocs([]);
      setReady(true);
      return;
    }
    if (!db || !storage) {
      setProblem("File storage isn’t set up for this site yet.");
      setReady(true);
      return;
    }

    setReady(false);
    const fail = () => {
      setProblem("Couldn’t load the archive. Check your connection and reload.");
      setReady(true);
    };
    const offFiles = onSnapshot(
      query(collection(db, "files"), orderBy("createdAt", "desc")),
      (snap) => {
        setFiles(snap.docs.map((d) => ({ ...(d.data() as Omit<ArchiveFile, "id">), id: d.id })));
        setReady(true);
      },
      fail,
    );
    const offFolders = onSnapshot(
      collection(db, "fileFolders"),
      (snap) => setFolderDocs(snap.docs.map((d) => String(d.data().name ?? "")).filter(Boolean)),
      () => {},
    );
    return () => {
      offFiles();
      offFolders();
    };
  }, [user, loading]);

  // A folder exists if it was created or if any file is in it (so a missing folder doc never hides files).
  const folders = useMemo(
    () => uniqueFolders([...folderDocs, ...files.map(folderOf).filter(Boolean)]).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true })),
    [folderDocs, files],
  );

  const upload = useCallback<FileStore["upload"]>(
    async (file, folder, onProgress) => {
      const contentType = file.type || "application/octet-stream";
      const id = newFileId();

      if (!user || !db || !storage) {
        if (!PREVIEW_MODE) throw new Error("Sign in to upload files.");
        local.current.set(id, URL.createObjectURL(file));
        setFiles((f) => [
          { id, name: file.name, size: file.size, contentType, kind: kindOf(file.name, contentType), path: id, uploaderUid: "preview", uploaderName: "You", createdAt: Date.now(), folder },
          ...f,
        ]);
        onProgress(1);
        return;
      }

      const path = `files/${user.uid}/${id}/${storageName(file.name)}`;
      const objectRef = ref(storage, path);
      await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(objectRef, file, { contentType });
        task.on(
          "state_changed",
          (s) => onProgress(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0),
          reject,
          () => resolve(),
        );
      });

      try {
        await setDoc(doc(db, "files", id), {
          name: file.name,
          size: file.size,
          contentType,
          kind: kindOf(file.name, contentType),
          path,
          uploaderUid: user.uid,
          uploaderName: user.displayName ?? user.email ?? "Someone",
          createdAt: Date.now(),
          folder,
        });
      } catch (e) {
        // Don't leave bytes behind that nothing points to.
        await deleteObject(objectRef).catch(() => {});
        throw e;
      }
    },
    [user],
  );

  const remove = useCallback<FileStore["remove"]>(
    async (file) => {
      if (!db || !storage || !user) {
        const url = local.current.get(file.id);
        if (url) URL.revokeObjectURL(url);
        local.current.delete(file.id);
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
      if (!db || !user) {
        setFiles((f) => f.map((x) => (x.id === file.id ? { ...x, name } : x)));
        return;
      }
      await updateDoc(doc(db, "files", file.id), { name });
    },
    [user],
  );

  const move = useCallback<FileStore["move"]>(
    async (file, folder) => {
      if (!db || !user) {
        setFiles((f) => f.map((x) => (x.id === file.id ? { ...x, folder } : x)));
        return;
      }
      await updateDoc(doc(db, "files", file.id), { folder });
    },
    [user],
  );

  // Updates the `folder` of many files, a batch at a time (Firestore caps a batch at 500 writes).
  const refile = useCallback(
    async (ids: string[], folder: string, extra?: (b: ReturnType<typeof writeBatch>) => void) => {
      if (!db) return;
      for (let i = 0; i < Math.max(ids.length, 1); i += BATCH) {
        const batch = writeBatch(db);
        ids.slice(i, i + BATCH).forEach((id) => batch.update(doc(db!, "files", id), { folder }));
        if (i === 0) extra?.(batch);
        await batch.commit();
      }
    },
    [],
  );

  const createFolder = useCallback<FileStore["createFolder"]>(
    async (name) => {
      const clean = name.trim();
      if (!db || !user) {
        setFolderDocs((f) => uniqueFolders([...f, clean]));
        return;
      }
      await setDoc(doc(db, "fileFolders", folderDocId(clean)), { name: clean, createdBy: user.uid, createdAt: Date.now() });
    },
    [user],
  );

  const renameFolder = useCallback<FileStore["renameFolder"]>(
    async (from, to) => {
      const next = to.trim();
      const ids = files.filter((f) => sameName(folderOf(f), from)).map((f) => f.id);
      if (!db || !user) {
        setFolderDocs((f) => uniqueFolders([...f.filter((x) => !sameName(x, from)), next]));
        setFiles((all) => all.map((x) => (sameName(folderOf(x), from) ? { ...x, folder: next } : x)));
        return;
      }
      const database = db;
      await refile(ids, next, (b) => {
        b.set(doc(database, "fileFolders", folderDocId(next)), { name: next, createdBy: user.uid, createdAt: Date.now() });
        // A change of letter case keeps the same document, so there is nothing old to remove.
        if (folderDocId(from) !== folderDocId(next)) b.delete(doc(database, "fileFolders", folderDocId(from)));
      });
    },
    [user, files, refile],
  );

  const deleteFolder = useCallback<FileStore["deleteFolder"]>(
    async (name) => {
      const ids = files.filter((f) => sameName(folderOf(f), name)).map((f) => f.id);
      if (!db || !user) {
        setFolderDocs((f) => f.filter((x) => !sameName(x, name)));
        setFiles((all) => all.map((x) => (sameName(folderOf(x), name) ? { ...x, folder: "" } : x)));
        return;
      }
      const database = db;
      await refile(ids, "", (b) => b.delete(doc(database, "fileFolders", folderDocId(name))));
    },
    [user, files, refile],
  );

  const urlFor = useCallback<FileStore["urlFor"]>(async (file) => {
    const blob = local.current.get(file.id);
    if (blob) return blob;
    if (!storage) throw new Error("File storage isn’t set up.");
    return getDownloadURL(ref(storage, file.path));
  }, []);

  return useMemo(
    () => ({
      files, folders, ready, problem, temporary: !cloud, me: user?.uid ?? (PREVIEW_MODE ? "preview" : null),
      upload, remove, rename, move, createFolder, renameFolder, deleteFolder, urlFor,
    }),
    [files, folders, ready, problem, cloud, user, upload, remove, rename, move, createFolder, renameFolder, deleteFolder, urlFor],
  );
}
