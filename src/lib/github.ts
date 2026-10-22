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

export async function searchRepos(q: string, perPage = 20): Promise<Repo[]> {
  const url = `${API}/search/repositories?q=${encodeURIComponent(q)}&per_page=${perPage}&sort=stars`;
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
  if (!repoRes.ok) return null;
  const repo = toRepo(await repoRes.json());
  const readme = readmeRes.ok ? (await readmeRes.text()).slice(0, 6000) : "";
  const languages: Record<string, number> = langRes.ok ? await langRes.json() : {};
  return { repo, readme, languages };
}
