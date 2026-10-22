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
  list: string;
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
