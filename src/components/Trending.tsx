import Link from "next/link";
import { searchRepos } from "@/lib/github";
import { RepoCard } from "./RepoCard";

// New repos from the last week, ranked by stars. Fails quietly: the home page works without it.
export async function Trending() {
  const since = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  let repos: Awaited<ReturnType<typeof searchRepos>> = [];
  try {
    repos = await searchRepos(`created:>${since}`, 5, "stars");
  } catch {
    return null;
  }
  if (repos.length === 0) return null;

  return (
    <section>
      <div className="section-head">
        <h2>Trending this week</h2>
        <Link href={`/search?q=${encodeURIComponent(`created:>${since}`)}&sort=stars`}>See more</Link>
      </div>
      <div className="stack">
        {repos.map((r) => (
          <RepoCard key={r.fullName} repo={r} />
        ))}
      </div>
    </section>
  );
}
