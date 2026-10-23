import type { Repo } from "./types";

const KEY = "punx.viewed-repos.v1";
const MAX = 8;

export type ViewedRepo = Pick<Repo, "fullName" | "name" | "owner" | "description" | "avatar" | "stars" | "language">;

export function readViewed(): ViewedRepo[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// Remembers the repo pages you open (on this device only) so Home can offer them again.
export function rememberViewed(r: Repo) {
  try {
    const entry: ViewedRepo = {
      fullName: r.fullName,
      name: r.name,
      owner: r.owner,
      description: r.description,
      avatar: r.avatar,
      stars: r.stars,
      language: r.language,
    };
    const next = [entry, ...readViewed().filter((x) => x.fullName !== r.fullName)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}
