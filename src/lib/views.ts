import { doc, increment, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const SEEN_KEY = "punx.viewed.v1";

export const repoStatKey = (owner: string, name: string) => `repo_${owner}__${name}`.toLowerCase();
export const shareStatKey = (id: string) => `share_${id}`;

function seenBefore(key: string): boolean {
  try {
    const seen: string[] = JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]");
    if (seen.includes(key)) return true;
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen, key]));
  } catch {
    // Storage blocked: fall through and count it.
  }
  return false;
}

// Counts one view per browser session, so reloading a page doesn't inflate the number.
export function recordView(key: string) {
  if (!db || seenBefore(key)) return;
  setDoc(doc(db, "stats", key), { views: increment(1) }, { merge: true }).catch(() => {});
}
