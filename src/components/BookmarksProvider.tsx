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
  writeBatch,
} from "firebase/firestore";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import type { Bookmark, Repo } from "@/lib/types";
import { useAuth } from "./AuthProvider";

export const DEFAULT_LIST = "Saved";

const STORAGE_KEY = "punx.bookmarks.v1";

type BookmarksCtx = {
  bookmarks: Bookmark[];
  ready: boolean;
  isSaved: (fullName: string) => boolean;
  toggle: (repo: Repo) => Promise<boolean>;
  moveToList: (fullName: string, list: string) => Promise<void>;
  replaceAll: (next: Bookmark[]) => Promise<void>;
};

const Ctx = createContext<BookmarksCtx | null>(null);

const docId = (fullName: string) => fullName.replace("/", "__");

function loadLocal(): Bookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocal(next: Bookmark[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked; the in-memory list still works for this session.
  }
}

// Signed in: bookmarks live in Firestore under users/{uid}/bookmarks.
// Signed out: they live in localStorage, and get merged into the account on sign-in.
export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [ready, setReady] = useState(false);
  const merged = useRef<string | null>(null);
  const cloud = Boolean(user && db);

  useEffect(() => {
    if (loading) return;

    if (!user || !db) {
      merged.current = null;
      setBookmarks(loadLocal());
      setReady(true);
      const onStorage = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY) setBookmarks(loadLocal());
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }

    const col = collection(db, "users", user.uid, "bookmarks");
    return onSnapshot(
      query(col, orderBy("savedAt", "desc")),
      (snap) => {
        const remote = snap.docs.map((d) => d.data() as Bookmark);
        setBookmarks(remote);
        setReady(true);

        // One-time merge of guest bookmarks into the account.
        if (merged.current !== user.uid) {
          merged.current = user.uid;
          const have = new Set(remote.map((b) => b.fullName));
          const extra = loadLocal().filter((b) => !have.has(b.fullName));
          if (extra.length) {
            const batch = writeBatch(db!);
            for (const b of extra) batch.set(doc(col, docId(b.fullName)), b);
            batch.commit().then(() => saveLocal([]), () => {});
          }
        }
      },
      () => setReady(true),
    );
  }, [user, loading]);

  const saved = useMemo(() => new Set(bookmarks.map((b) => b.fullName)), [bookmarks]);
  const isSaved = useCallback((fullName: string) => saved.has(fullName), [saved]);

  const local = useCallback((next: Bookmark[]) => {
    setBookmarks(next);
    saveLocal(next);
  }, []);

  const toggle = useCallback(
    async (repo: Repo) => {
      const isOn = saved.has(repo.fullName);
      if (cloud && user && db) {
        const ref = doc(db, "users", user.uid, "bookmarks", docId(repo.fullName));
        if (isOn) await deleteDoc(ref);
        else await setDoc(ref, { ...repo, list: DEFAULT_LIST, savedAt: Date.now() });
      } else if (isOn) {
        local(bookmarks.filter((b) => b.fullName !== repo.fullName));
      } else {
        local([{ ...repo, list: DEFAULT_LIST, savedAt: Date.now() }, ...bookmarks]);
      }
      return true;
    },
    [saved, cloud, user, bookmarks, local],
  );

  const moveToList = useCallback(
    async (fullName: string, list: string) => {
      if (cloud && user && db) {
        await updateDoc(doc(db, "users", user.uid, "bookmarks", docId(fullName)), { list });
      } else {
        local(bookmarks.map((b) => (b.fullName === fullName ? { ...b, list } : b)));
      }
    },
    [cloud, user, bookmarks, local],
  );

  // Used by import: adds any bookmarks not already saved.
  const replaceAll = useCallback(
    async (next: Bookmark[]) => {
      if (cloud && user && db) {
        const have = new Set(bookmarks.map((b) => b.fullName));
        const batch = writeBatch(db);
        for (const b of next) {
          if (!have.has(b.fullName)) batch.set(doc(db, "users", user.uid, "bookmarks", docId(b.fullName)), b);
        }
        await batch.commit();
      } else {
        local(next);
      }
    },
    [cloud, user, bookmarks, local],
  );

  const value = useMemo(
    () => ({ bookmarks, ready, isSaved, toggle, moveToList, replaceAll }),
    [bookmarks, ready, isSaved, toggle, moveToList, replaceAll],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBookmarks() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBookmarks must be used inside BookmarksProvider");
  return ctx;
}
