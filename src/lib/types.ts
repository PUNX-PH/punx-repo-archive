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
