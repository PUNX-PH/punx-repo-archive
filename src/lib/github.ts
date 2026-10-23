import type { Repo } from "./types";

const API = "https://api.github.com";

function headers(): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toRepo(r: any): Repo {
  return {
    fullName: r.full_name,
    name: r.name,
    owner: r.owner?.login ?? "",
    description: r.description ?? null,
    stars: r.stargazers_count ?? 0,
    forks: r.forks_count ?? 0,
    language: r.language ?? null,
    topics: r.topics ?? [],
    url: r.html_url,
    avatar: r.owner?.avatar_url ?? "",
    updatedAt: r.pushed_at ?? r.updated_at ?? "",
  };
}

export type Sort = "best" | "stars" | "updated";

// Without a sort, GitHub ranks by best match, which is what a typed query usually wants.
export async function searchRepos(q: string, perPage = 20, sort: Sort = "best", page = 1): Promise<Repo[]> {
  const sortParam = sort === "best" ? "" : `&sort=${sort}`;
  const url = `${API}/search/repositories?q=${encodeURIComponent(q)}&per_page=${perPage}&page=${page}${sortParam}`;
  const res = await fetch(url, { headers: headers(), next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`GitHub search failed (${res.status})`);
  const data = await res.json();
  return (data.items ?? []).map(toRepo);
}

export async function getRepo(owner: string, name: string) {
  const base = `${API}/repos/${owner}/${name}`;
  const [repoRes, readmeRes, langRes] = await Promise.all([
    fetch(base, { headers: headers(), next: { revalidate: 600 } }),
    fetch(`${base}/readme`, {
      headers: { ...headers(), Accept: "application/vnd.github.raw+json" },
      next: { revalidate: 600 },
    }),
    fetch(`${base}/languages`, { headers: headers(), next: { revalidate: 600 } }),
  ]);
  if (repoRes.status === 404) return null;
  // Rate limits and outages are not "not found"; let the error page explain.
  if (!repoRes.ok) throw new Error(`GitHub request failed (${repoRes.status})`);
  const raw = await repoRes.json();
  const repo = toRepo(raw);
  const readme = readmeRes.ok ? (await readmeRes.text()).slice(0, 15000) : "";
  const languages: Record<string, number> = langRes.ok ? await langRes.json() : {};
  // Details only the repo page needs.
  const extra: RepoExtra = {
    license: raw.license?.spdx_id && raw.license.spdx_id !== "NOASSERTION" ? raw.license.spdx_id : (raw.license?.name ?? null),
    openIssues: raw.open_issues_count ?? 0,
    homepage: typeof raw.homepage === "string" && /^https?:\/\//.test(raw.homepage) ? raw.homepage : null,
    archived: Boolean(raw.archived),
    defaultBranch: raw.default_branch ?? "main",
  };
  return { repo, readme, languages, extra };
}

export type RepoExtra = {
  license: string | null;
  openIssues: number;
  homepage: string | null;
  archived: boolean;
  defaultBranch: string;
};

// A few popular repos that share this repo's first topic, for the "More like this" row.
export async function getRelated(repo: Repo): Promise<Repo[]> {
  const topic = repo.topics[0];
  if (!topic) return [];
  try {
    const found = await searchRepos(`topic:${topic} stars:>50`, 7, "stars");
    return found.filter((r) => r.fullName !== repo.fullName).slice(0, 4);
  } catch {
    return [];
  }
}

/** Basic repo info for one owner/name. Null when it doesn't exist; throws on rate limits and outages. */
export async function getRepoBasic(owner: string, name: string): Promise<Repo | null> {
  const res = await fetch(`${API}/repos/${owner}/${name}`, { headers: headers(), next: { revalidate: 600 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub request failed (${res.status})`);
  return toRepo(await res.json());
}
