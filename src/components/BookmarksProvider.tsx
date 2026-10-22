"use client";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import type { Bookmark, Repo } from "@/lib/types";
import { useAuth } from "./AuthProvider";

export const DEFAULT_LIST = "Saved";

type BookmarksCtx = {
  bookmarks: Bookmark[];
  ready: boolean;
  isSaved: (fullName: string) => boolean;
  toggle: (repo: Repo) => Promise<boolean>;
  moveToList: (fullName: string, list: string) => Promise<void>;
};

const Ctx = createContext<BookmarksCtx | null>(null);

const docId = (fullName: string) => fullName.replace("/", "__");

export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user || !db) {
      setBookmarks([]);
      setReady(true);
      return;
    }
    const q = query(collection(db, "users", user.uid, "bookmarks"), orderBy("savedAt", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        setBookmarks(snap.docs.map((d) => d.data() as Bookmark));
        setReady(true);
      },
      () => setReady(true),
    );
  }, [user]);

  const saved = useMemo(() => new Set(bookmarks.map((b) => b.fullName)), [bookmarks]);

  const isSaved = useCallback((fullName: string) => saved.has(fullName), [saved]);

  // Returns false when the user is signed out so the caller can send them to login.
  const toggle = useCallback(
    async (repo: Repo) => {
      if (!user || !db) return false;
      const ref = doc(db, "users", user.uid, "bookmarks", docId(repo.fullName));
      if (saved.has(repo.fullName)) await deleteDoc(ref);
      else await setDoc(ref, { ...repo, list: DEFAULT_LIST, savedAt: Date.now() });
      return true;
    },
    [user, saved],
  );

  const moveToList = useCallback(
    async (fullName: string, list: string) => {
      if (!user || !db) return;
      await updateDoc(doc(db, "users", user.uid, "bookmarks", docId(fullName)), { list });
    },
    [user],
  );

  const value = useMemo(
    () => ({ bookmarks, ready, isSaved, toggle, moveToList }),
    [bookmarks, ready, isSaved, toggle, moveToList],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBookmarks() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBookmarks must be used inside BookmarksProvider");
  return ctx;
}
