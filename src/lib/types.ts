export type Repo = {
  fullName: string;
  name: string;
  owner: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  topics: string[];
  url: string;
  avatar: string;
  updatedAt: string;
};

export type Bookmark = Repo & {
  /** The first folder. Kept for older saved data; `lists` is the full set. */
  list: string;
  /** Every folder this repo is in. Older saves only have `list`, so read through listsOf(). */
  lists?: string[];
  savedAt: number;
};

// A public, link-based snapshot of one folder. Anyone with the id can read it; only the owner can change it.
export type Share = {
  id: string;
  ownerUid: string;
  ownerName: string;
  folder: string;
  repos: Repo[];
  /** Sorted repo names, used to detect when the folder changed and the share needs refreshing. */
  sig: string;
  createdAt: number;
  updatedAt: number;
};

// A folder someone else shared that this user has opened, kept so it can be found again.
export type SharedWithMe = {
  shareId: string;
  folder: string;
  ownerName: string;
  repoCount: number;
  openedAt: number;
};
