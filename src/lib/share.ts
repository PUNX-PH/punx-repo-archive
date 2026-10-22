import type { Bookmark, Repo } from "./types";

export const MAX_SHARED_REPOS = 200;

export function newShareId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Strips per-user fields so a share only carries public repo info.
export function toSharedRepo(b: Bookmark): Repo {
  return {
    fullName: b.fullName,
    name: b.name,
    owner: b.owner,
    description: b.description ?? null,
    stars: b.stars,
    forks: b.forks,
    language: b.language ?? null,
    topics: b.topics ?? [],
    url: b.url,
    avatar: b.avatar,
    updatedAt: b.updatedAt ?? "",
  };
}

export const signature = (repos: { fullName: string }[]) =>
  repos.map((r) => r.fullName).sort().join("|");
