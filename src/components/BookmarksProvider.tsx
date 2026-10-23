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
  where,
  writeBatch,
} from "firebase/firestore";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { PREVIEW_MODE } from "@/lib/domain";
import { db } from "@/lib/firebase";
import { DEFAULT_LIST, inFolderOf, listsOf, sameName, uniqueFolders, withFolder, withoutFolder } from "@/lib/folders";
import { MAX_SHARED_REPOS, newShareId, signature, toSharedRepo } from "@/lib/share";
import type { Bookmark, Repo, Share, SharedWithMe } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { FolderPicker } from "./FolderPicker";

const STORAGE_KEY = "punx.bookmarks.v1";
const FOLDERS_KEY = "punx.folders.v1";

type BookmarksCtx = {
  bookmarks: Bookmark[];
  /** Every folder, default first. Includes empty folders. */
  folders: string[];
  ready: boolean;
  isSaved: (fullName: string) => boolean;
  toggle: (repo: Repo) => Promise<boolean>;
  /** Replaces the set of folders a saved repo is in. Never leaves it in none (it falls back to the default folder). */
  setFolders: (fullName: string, next: string[], opts?: { message?: string; quiet?: boolean }) => Promise<void>;
  createFolder: (name: string) => Promise<string | null>;
  renameFolder: (from: string, to: string) => Promise<void>;
  deleteFolder: (name: string) => Promise<void>;
  openFolderPicker: (fullName: string) => void;
  replaceAll: (next: Bookmark[]) => Promise<void>;
  /**
   * Saves repos into a folder (created if needed; the default folder if omitted). New repos are saved;
   * repos you already have are also added to that folder when one is named.
   */
  saveMany: (repos: Repo[], folder?: string) => Promise<{ created: number; linked: number }>;
  /** True when signed in, which is required to share. */
  canShare: boolean;
  /** The user's active shares, one per shared folder. */
  shares: Share[];
  shareFolder: (folder: string) => Promise<Share | null>;
  unshareFolder: (folder: string) => Promise<void>;
  /** Folders others shared that this user has opened, newest first. */
  sharedWithMe: SharedWithMe[];
  rememberShared: (share: Share) => void;
  forgetShared: (shareId: string) => Promise<void>;
  /** Copies someone else's shared folder into this library. Returns how many repos were new. */
  importFolder: (folder: string, repos: Repo[]) => Promise<{ folder: string; added: number }>;
};

const Ctx = createContext<BookmarksCtx | null>(null);

const docId = (fullName: string) => fullName.replace("/", "__");
const folderDocId = (name: string) => encodeURIComponent(name.trim().toLowerCase());

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked; the in-memory copy still works for this session.
  }
}

const loadBookmarks = (): Bookmark[] => {
  const v = readJson<unknown>(STORAGE_KEY, []);
  return Array.isArray(v) ? (v as Bookmark[]) : [];
};

const loadFolders = (): string[] => {
  const v = readJson<unknown>(FOLDERS_KEY, []);
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
};

type Toast = { message: string; undo?: () => void; folderFor?: string };

// Signed in: bookmarks and folders live in Firestore under users/{uid}.
// Signed out: they live in localStorage, and get merged into the account on sign-in.
export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [folderNames, setFolderNames] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [shares, setShares] = useState<Share[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<SharedWithMe[]>([]);
  const merged = useRef<string | null>(null);
  const syncing = useRef(new Map<string, string>());
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const cloud = Boolean(user && db);

  useEffect(() => {
    if (loading) return;

    if (!user || !db) {
      merged.current = null;
      setShares([]);
      setSharedWithMe([]);
      setBookmarks(loadBookmarks());
      setFolderNames(loadFolders());
      setReady(true);
      const onStorage = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY) setBookmarks(loadBookmarks());
        if (e.key === FOLDERS_KEY) setFolderNames(loadFolders());
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }

    const bookmarksCol = collection(db, "users", user.uid, "bookmarks");
    const foldersCol = collection(db, "users", user.uid, "folders");

    const offBookmarks = onSnapshot(
      query(bookmarksCol, orderBy("savedAt", "desc")),
      (snap) => {
        const remote = snap.docs.map((d) => d.data() as Bookmark);
        setBookmarks(remote);
        setReady(true);

        // One-time merge of guest bookmarks and folders into the account.
        if (merged.current !== user.uid) {
          merged.current = user.uid;
          const have = new Set(remote.map((b) => b.fullName));
          const extra = loadBookmarks().filter((b) => !have.has(b.fullName));
          const extraFolders = loadFolders();
          if (extra.length || extraFolders.length) {
            const batch = writeBatch(db!);
            for (const b of extra) batch.set(doc(bookmarksCol, docId(b.fullName)), b);
            extraFolders.forEach((name, i) =>
              batch.set(doc(foldersCol, folderDocId(name)), { name, createdAt: Date.now() + i }, { merge: true }),
            );
            batch.commit().then(
              () => {
                writeJson(STORAGE_KEY, []);
                writeJson(FOLDERS_KEY, []);
              },
              () => {},
            );
          }
        }
      },
      () => setReady(true),
    );

    const offFolders = onSnapshot(
      query(foldersCol, orderBy("createdAt", "asc")),
      (snap) => setFolderNames(snap.docs.map((d) => String(d.data().name))),
      () => {},
    );

    const offShares = onSnapshot(
      query(collection(db, "shares"), where("ownerUid", "==", user.uid)),
      (snap) => setShares(snap.docs.map((d) => ({ ...(d.data() as Omit<Share, "id">), id: d.id }))),
      () => {},
    );

    const offSharedWithMe = onSnapshot(
      query(collection(db, "users", user.uid, "sharedWithMe"), orderBy("openedAt", "desc")),
      (snap) => setSharedWithMe(snap.docs.map((d) => d.data() as SharedWithMe)),
      () => {},
    );

    return () => {
      offBookmarks();
      offFolders();
      offShares();
      offSharedWithMe();
    };
  }, [user, loading]);

  // Folder list = created folders + any folder a bookmark already points at, default first.
  const folders = useMemo(() => {
    const out: string[] = [DEFAULT_LIST];
    const add = (n: string) => {
      if (n.trim() && !out.some((o) => sameName(o, n))) out.push(n);
    };
    folderNames.forEach(add);
    [...new Set(bookmarks.flatMap(listsOf))].sort((a, b) => a.localeCompare(b)).forEach(add);
    return out;
  }, [folderNames, bookmarks]);

  const saved = useMemo(() => new Set(bookmarks.map((b) => b.fullName)), [bookmarks]);
  const isSaved = useCallback((fullName: string) => saved.has(fullName), [saved]);

  const localBookmarks = useCallback((next: Bookmark[]) => {
    setBookmarks(next);
    writeJson(STORAGE_KEY, next);
  }, []);

  const localFolders = useCallback((next: string[]) => {
    setFolderNames(next);
    writeJson(FOLDERS_KEY, next);
  }, []);

  const showToast = useCallback((t: Toast) => {
    clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const toggleRef = useRef<(repo: Repo) => Promise<boolean>>(undefined);

  const restoreRef = useRef<(b: Bookmark) => Promise<void>>(undefined);

  // Puts a removed bookmark back exactly as it was, folders included (used by Undo).
  const restoreBookmark = useCallback(
    async (b: Bookmark) => {
      try {
        if (cloud && user && db) await setDoc(doc(db, "users", user.uid, "bookmarks", docId(b.fullName)), b);
        else localBookmarks([b, ...bookmarks.filter((x) => x.fullName !== b.fullName)]);
      } catch {
        showToast({ message: "Couldn’t restore that. Check your connection and try again." });
      }
    },
    [cloud, user, bookmarks, localBookmarks, showToast],
  );
  restoreRef.current = restoreBookmark;

  const toggle = useCallback(
    async (repo: Repo): Promise<boolean> => {
      const prev = bookmarks.find((b) => b.fullName === repo.fullName);
      const isOn = Boolean(prev);
      const row: Bookmark = { ...repo, list: DEFAULT_LIST, lists: [DEFAULT_LIST], savedAt: Date.now() };
      try {
        if (cloud && user && db) {
          const ref = doc(db, "users", user.uid, "bookmarks", docId(repo.fullName));
          if (isOn) await deleteDoc(ref);
          else await setDoc(ref, row);
        } else if (isOn) {
          localBookmarks(bookmarks.filter((b) => b.fullName !== repo.fullName));
        } else {
          localBookmarks([row, ...bookmarks]);
        }
      } catch {
        showToast({ message: "Couldn’t save that. Check your connection and try again." });
        return false;
      }
      showToast({
        message: isOn ? `Removed ${repo.name}` : `Saved ${repo.name}${cloud ? "" : " to this browser"}`,
        // Undoing a removal restores its folders; undoing a save removes it again.
        undo: isOn && prev ? () => void restoreRef.current?.(prev) : () => void toggleRef.current?.(repo),
        folderFor: isOn ? undefined : repo.fullName,
      });
      return true;
    },
    [cloud, user, bookmarks, localBookmarks, showToast],
  );
  toggleRef.current = toggle;

  const setFoldersRef = useRef<BookmarksCtx["setFolders"]>(undefined);

  // The one way a repo's folders change: the picker's checkboxes, drag and drop, and Undo.
  const setFolders = useCallback<BookmarksCtx["setFolders"]>(
    async (fullName, next, opts = {}) => {
      const prev = bookmarks.find((b) => b.fullName === fullName);
      if (!prev) return;
      const before = listsOf(prev);
      const after = uniqueFolders(next).length > 0 ? uniqueFolders(next) : [DEFAULT_LIST];
      const same = before.length === after.length && before.every((l) => after.some((a) => sameName(a, l)));
      if (same) return;
      try {
        if (cloud && user && db) {
          await updateDoc(doc(db, "users", user.uid, "bookmarks", docId(fullName)), { lists: after, list: after[0] });
        } else {
          localBookmarks(bookmarks.map((b) => (b.fullName === fullName ? { ...b, lists: after, list: after[0] } : b)));
        }
      } catch {
        showToast({ message: "Couldn’t update folders. Check your connection and try again." });
        return;
      }
      if (!opts.quiet) {
        showToast({
          message: opts.message ?? `Updated folders for ${prev.name}`,
          undo: () => void setFoldersRef.current?.(fullName, before, { quiet: true }),
        });
      }
    },
    [cloud, user, bookmarks, localBookmarks, showToast],
  );
  setFoldersRef.current = setFolders;

  // Returns the canonical name (an existing folder if the name matches one ignoring case), or null if blank.
  const createFolder = useCallback(
    async (raw: string) => {
      const name = raw.trim();
      if (!name) return null;
      const existing = folders.find((f) => sameName(f, name));
      if (existing) return existing;
      if (cloud && user && db) {
        await setDoc(doc(db, "users", user.uid, "folders", folderDocId(name)), { name, createdAt: Date.now() });
      } else {
        localFolders([...folderNames, name]);
      }
      return name;
    },
    [folders, cloud, user, folderNames, localFolders],
  );

  const renameFolder = useCallback(
    async (from: string, to: string) => {
      const next = to.trim();
      if (!next || from === DEFAULT_LIST) return;
      if (cloud && user && db) {
        const batch = writeBatch(db);
        batch.delete(doc(db, "users", user.uid, "folders", folderDocId(from)));
        batch.set(doc(db, "users", user.uid, "folders", folderDocId(next)), { name: next, createdAt: Date.now() });
        for (const b of bookmarks) {
          if (!inFolderOf(b, from)) continue;
          const lists = uniqueFolders(listsOf(b).map((l) => (sameName(l, from) ? next : l)));
          batch.update(doc(db, "users", user.uid, "bookmarks", docId(b.fullName)), { lists, list: lists[0] });
        }
        // Keep a shared link's title in step with the folder name.
        for (const s of shares) {
          if (sameName(s.folder, from)) batch.update(doc(db, "shares", s.id), { folder: next, updatedAt: Date.now() });
        }
        await batch.commit();
      } else {
        localFolders(folderNames.some((f) => sameName(f, from)) ? folderNames.map((f) => (sameName(f, from) ? next : f)) : [...folderNames, next]);
        localBookmarks(
          bookmarks.map((b) => {
            if (!inFolderOf(b, from)) return b;
            const lists = uniqueFolders(listsOf(b).map((l) => (sameName(l, from) ? next : l)));
            return { ...b, lists, list: lists[0] };
          }),
        );
      }
    },
    [cloud, user, bookmarks, folderNames, shares, localFolders, localBookmarks],
  );

  // Never deletes repos: they fall back to the default folder.
  const deleteFolder = useCallback(
    async (name: string) => {
      if (name === DEFAULT_LIST) return;
      if (cloud && user && db) {
        const batch = writeBatch(db);
        batch.delete(doc(db, "users", user.uid, "folders", folderDocId(name)));
        for (const b of bookmarks) {
          if (!inFolderOf(b, name)) continue;
          // Leaves only this folder; a repo that was in no other folder falls back to the default.
          const rest = withoutFolder(listsOf(b), name);
          const lists = rest.length > 0 ? rest : [DEFAULT_LIST];
          batch.update(doc(db, "users", user.uid, "bookmarks", docId(b.fullName)), { lists, list: lists[0] });
        }
        // A deleted folder's public link stops working.
        for (const s of shares) {
          if (sameName(s.folder, name)) batch.delete(doc(db, "shares", s.id));
        }
        await batch.commit();
      } else {
        localFolders(folderNames.filter((f) => !sameName(f, name)));
        localBookmarks(
          bookmarks.map((b) => {
            if (!inFolderOf(b, name)) return b;
            const rest = withoutFolder(listsOf(b), name);
            const lists = rest.length > 0 ? rest : [DEFAULT_LIST];
            return { ...b, lists, list: lists[0] };
          }),
        );
      }
    },
    [cloud, user, bookmarks, folderNames, shares, localFolders, localBookmarks],
  );

  const inFolder = useCallback(
    (folder: string) => bookmarks.filter((b) => inFolderOf(b, folder)).map(toSharedRepo),
    [bookmarks],
  );

  const shareFolder = useCallback(
    async (folder: string): Promise<Share | null> => {
      const live = cloud && user && db;
      // Local preview only (never in production): no account, so keep shares in memory to try the UI.
      if (!live && !PREVIEW_MODE) return null;
      const existing = shares.find((s) => sameName(s.folder, folder));
      if (existing) return existing;
      const repos = inFolder(folder).slice(0, MAX_SHARED_REPOS);
      const now = Date.now();
      const share: Share = {
        id: newShareId(),
        ownerUid: user?.uid ?? "preview",
        ownerName: user?.displayName?.trim() || "A Punx user",
        folder,
        repos,
        sig: signature(repos),
        createdAt: now,
        updatedAt: now,
      };
      if (!live) {
        setShares((prev) => [...prev, share]);
        return share;
      }
      const { id, ...data } = share;
      await setDoc(doc(db!, "shares", id), data);
      return share;
    },
    [cloud, user, shares, inFolder],
  );

  const unshareFolder = useCallback(
    async (folder: string) => {
      const s = shares.find((x) => sameName(x.folder, folder));
      if (!s) return;
      if (!db || !cloud) {
        if (PREVIEW_MODE) setShares((prev) => prev.filter((x) => x.id !== s.id));
        return;
      }
      await deleteDoc(doc(db, "shares", s.id));
    },
    [shares],
  );

  // Keep each public link current as the owner adds or removes repos in the folder.
  useEffect(() => {
    if (!cloud || !db || !ready) return;
    for (const s of shares) {
      const repos = inFolder(s.folder).slice(0, MAX_SHARED_REPOS);
      const sig = signature(repos);
      if (sig === s.sig || syncing.current.get(s.id) === sig) continue;
      syncing.current.set(s.id, sig);
      updateDoc(doc(db, "shares", s.id), { repos, sig, updatedAt: Date.now() }).catch(() => syncing.current.delete(s.id));
    }
  }, [cloud, ready, shares, inFolder]);

  const importFolder = useCallback(
    async (folder: string, repos: Repo[]) => {
      // Reuse a folder of the same name, so importing twice doesn't create duplicates.
      const target = (await createFolder(folder)) ?? DEFAULT_LIST;
      const byName = new Map(bookmarks.map((b) => [b.fullName.toLowerCase(), b]));
      const now = Date.now();
      const rows: Bookmark[] = repos
        .filter((r) => !byName.has(r.fullName.toLowerCase()))
        .map((r, i) => ({ ...r, list: target, lists: [target], savedAt: now - i }));
      // Repos you already have are added to the imported folder too, so it matches what was shared.
      const toLink = repos
        .map((r) => byName.get(r.fullName.toLowerCase()))
        .filter((b): b is Bookmark => Boolean(b) && !inFolderOf(b as Bookmark, target));
      if (cloud && user && db) {
        const batch = writeBatch(db);
        for (const b of rows) batch.set(doc(db, "users", user.uid, "bookmarks", docId(b.fullName)), b);
        for (const b of toLink) {
          const lists = withFolder(listsOf(b), target);
          batch.update(doc(db, "users", user.uid, "bookmarks", docId(b.fullName)), { lists, list: lists[0] });
        }
        await batch.commit();
      } else {
        const linkSet = new Set(toLink.map((b) => b.fullName));
        const updated = bookmarks.map((b) => {
          if (!linkSet.has(b.fullName)) return b;
          const lists = withFolder(listsOf(b), target);
          return { ...b, lists, list: lists[0] };
        });
        localBookmarks([...rows, ...updated]);
      }
      return { folder: target, added: rows.length + toLink.length };
    },
    [createFolder, bookmarks, cloud, user, localBookmarks],
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
        localBookmarks(next);
      }
    },
    [cloud, user, bookmarks, localBookmarks],
  );

  // Called when someone opens a share link, so it shows up under Library > Shared later.
  const rememberShared = useCallback(
    (share: Share) => {
      if (!cloud || !user || !db || share.ownerUid === user.uid) return;
      const entry: SharedWithMe = { shareId: share.id, folder: share.folder, ownerName: share.ownerName, repoCount: share.repos.length, openedAt: Date.now() };
      setDoc(doc(db, "users", user.uid, "sharedWithMe", share.id), entry).catch(() => {});
    },
    [cloud, user],
  );

  const forgetShared = useCallback(
    async (shareId: string) => {
      if (!cloud || !user || !db) return;
      await deleteDoc(doc(db, "users", user.uid, "sharedWithMe", shareId));
    },
    [cloud, user],
  );

  const saveMany = useCallback(
    async (repos: Repo[], folder?: string) => {
      const byName = new Map(bookmarks.map((b) => [b.fullName.toLowerCase(), b]));
      const now = Date.now();
      // Make sure a named folder exists first, and use its canonical spelling.
      const named = Boolean(folder?.trim());
      const target = named ? ((await createFolder(folder as string)) ?? DEFAULT_LIST) : DEFAULT_LIST;
      const rows: Bookmark[] = repos
        .filter((r) => !byName.has(r.fullName.toLowerCase()))
        .map((r, i) => ({ ...r, list: target, lists: [target], savedAt: now - i }));
      // With an explicit folder, repos you already have are added to it as well.
      const toLink = named
        ? repos
            .map((r) => byName.get(r.fullName.toLowerCase()))
            .filter((b): b is Bookmark => Boolean(b) && !inFolderOf(b as Bookmark, target))
        : [];
      if (rows.length === 0 && toLink.length === 0) return { created: 0, linked: 0 };
      try {
        if (cloud && user && db) {
          const batch = writeBatch(db);
          for (const b of rows) batch.set(doc(db, "users", user.uid, "bookmarks", docId(b.fullName)), b);
          for (const b of toLink) {
            const lists = withFolder(listsOf(b), target);
            batch.update(doc(db, "users", user.uid, "bookmarks", docId(b.fullName)), { lists, list: lists[0] });
          }
          await batch.commit();
        } else {
          const linkSet = new Set(toLink.map((b) => b.fullName));
          const updated = bookmarks.map((b) => {
            if (!linkSet.has(b.fullName)) return b;
            const lists = withFolder(listsOf(b), target);
            return { ...b, lists, list: lists[0] };
          });
          localBookmarks([...rows, ...updated]);
        }
      } catch {
        showToast({ message: "Couldn’t save those. Check your connection and try again." });
        return { created: 0, linked: 0 };
      }
      const n = rows.length + toLink.length;
      showToast({ message: `Saved ${n} repo${n === 1 ? "" : "s"} to ${target}` });
      return { created: rows.length, linked: toLink.length };
    },
    [bookmarks, cloud, user, localBookmarks, showToast, createFolder],
  );

  const openFolderPicker = useCallback((fullName: string) => setPickerFor(fullName), []);

  const value = useMemo(
    () => ({
      bookmarks, folders, ready, isSaved, toggle, setFolders, createFolder, renameFolder, deleteFolder, openFolderPicker, replaceAll,
      saveMany, canShare: cloud || PREVIEW_MODE, shares, shareFolder, unshareFolder, importFolder, sharedWithMe, rememberShared, forgetShared,
    }),
    [bookmarks, folders, ready, isSaved, toggle, setFolders, createFolder, renameFolder, deleteFolder, openFolderPicker, replaceAll, cloud, shares, shareFolder, unshareFolder, importFolder, sharedWithMe, rememberShared, forgetShared, saveMany],
  );

  const pickerBookmark = pickerFor ? bookmarks.find((b) => b.fullName === pickerFor) : undefined;

  return (
    <Ctx.Provider value={value}>
      {children}

      {pickerBookmark && (
        <FolderPicker
          repoName={pickerBookmark.fullName}
          folders={folders}
          current={listsOf(pickerBookmark)}
          onToggle={(f, on) => {
            const now = listsOf(pickerBookmark);
            void setFolders(pickerBookmark.fullName, on ? withFolder(now, f) : withoutFolder(now, f), {
              quiet: true,
            });
          }}
          onCreate={createFolder}
          onClose={() => setPickerFor(null)}
        />
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span>{toast.message}</span>
          {toast.folderFor && (
            <button
              onClick={() => {
                setPickerFor(toast.folderFor!);
                setToast(null);
              }}
            >
              Folder
            </button>
          )}
          {toast.undo && (
            <button
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useBookmarks() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBookmarks must be used inside BookmarksProvider");
  return ctx;
}
