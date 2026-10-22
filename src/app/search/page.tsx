import { RepoCard } from "@/components/RepoCard";
import { SearchBox } from "@/components/SearchBox";
import { searchRepos } from "@/lib/github";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let repos: Awaited<ReturnType<typeof searchRepos>> = [];
  let error: string | null = null;
  if (query) {
    try {
      repos = await searchRepos(query);
    } catch (e) {
      error = (e as Error).message;
    }
  }

  return (
    <>
      <h1>Search</h1>
      <SearchBox initial={query} autoFocus={!query} />
      {error && <p className="error">{error}. GitHub rate-limits unauthenticated requests; try again shortly.</p>}
      {query && !error && repos.length === 0 && <p className="muted">No repos found for “{query}”.</p>}
      <div className="stack">
        {repos.map((r) => (
          <RepoCard key={r.fullName} repo={r} />
        ))}
      </div>
    </>
  );
}
