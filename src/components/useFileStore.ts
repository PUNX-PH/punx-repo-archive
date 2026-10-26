"use client";

import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PREVIEW_MODE } from "@/lib/domain";
import { db, storage } from "@/lib/firebase";
import { kindOf, newFileId, storageName, type ArchiveFile } from "@/lib/files";
import { useAuth } from "./AuthProvider";

export type FileStore = {
  files: ArchiveFile[];
  ready: boolean;
  /** Why files can't be used at all (storage not set up, or loading failed). */
  problem: string | null;
  /** True in the local preview, where files only live until the page is closed. */
  temporary: boolean;
  me: string | null;
  upload: (file: File, onProgress: (fraction: number) => void) => Promise<void>;
  remove: (file: ArchiveFile) => Promise<void>;
  rename: (file: ArchiveFile, name: string) => Promise<void>;
  /** A link that opens or downloads the file. Resolved on demand because it needs a round trip to Storage. */
  urlFor: (file: ArchiveFile) => Promise<string>;
};

// Signed in: the list is the Firestore `files` collection, the bytes are in Firebase Storage.
// Local preview (no sign-in): everything stays in memory so the screen can be tried without a bucket.
export function useFileStore(): FileStore {
  const { user, loading } = useAuth();
  const cloud = Boolean(user && db && storage);
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const local = useRef(new Map<string, string>());

  useEffect(() => {
    if (loading) return;
    setProblem(null);

    if (!user) {
      setFiles([]);
      setReady(true);
      return;
    }
    if (!db || !storage) {
      setProblem("File storage isn’t set up for this site yet.");
      setReady(true);
      return;
    }

    setReady(false);
    return onSnapshot(
      query(collection(db, "files"), orderBy("createdAt", "desc")),
      (snap) => {
        setFiles(snap.docs.map((d) => ({ ...(d.data() as Omit<ArchiveFile, "id">), id: d.id })));
        setReady(true);
      },
      () => {
        setProblem("Couldn’t load the archive. Check your connection and reload.");
        setReady(true);
      },
    );
  }, [user, loading]);

  const upload = useCallback<FileStore["upload"]>(
    async (file, onProgress) => {
      const contentType = file.type || "application/octet-stream";
      const id = newFileId();

      if (!user || !db || !storage) {
        if (!PREVIEW_MODE) throw new Error("Sign in to upload files.");
        local.current.set(id, URL.createObjectURL(file));
        setFiles((f) => [
          { id, name: file.name, size: file.size, contentType, kind: kindOf(file.name, contentType), path: id, uploaderUid: "preview", uploaderName: "You", createdAt: Date.now() },
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

  const urlFor = useCallback<FileStore["urlFor"]>(
    async (file) => {
      const local_ = local.current.get(file.id);
      if (local_) return local_;
      if (!storage) throw new Error("File storage isn’t set up.");
      return getDownloadURL(ref(storage, file.path));
    },
    [],
  );

  return useMemo(
    () => ({ files, ready, problem, temporary: !cloud, me: user?.uid ?? (PREVIEW_MODE ? "preview" : null), upload, remove, rename, urlFor }),
    [files, ready, problem, cloud, user, upload, remove, rename, urlFor],
  );
}
