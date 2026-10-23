import Link from "next/link";
import type { Metadata } from "next";
import { SearchIcon } from "@/components/Icons";
import { RecentSearches } from "@/components/RecentSearches";
import { RepoCard } from "@/components/RepoCard";
import { SearchBox } from "@/components/SearchBox";
import { searchRepos, type Sort } from "@/lib/github";

type Params = { q?: string; sort?: string; lang?: string; page?: string };

const PER_PAGE = 20;
const MAX_PAGE = 50;

const SORTS: { value: Sort; label: string }[] = [
  { value: "best", label: "Best match" },
  { value: "stars", label: "Most stars" },
  { value: "updated", label: "Recently updated" },
];

const LANGS = ["TypeScript", "JavaScript", "Python", "Go", "Rust", "Java"];

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q?.trim() ? `“${q.trim()}”` : "Search" };
}

// Changing sort or language starts back at page 1 (page is only passed by the pager).
function href(q: string, sort: string, lang: string, page = 1) {
  const p = new URLSearchParams({ q });
  if (sort !== "best") p.set("sort", sort);
  if (lang) p.set("lang", lang);
  if (page > 1) p.set("page", String(page));
  return `/search?${p}`;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { q, sort: sortParam, lang = "", page: pageParam } = await searchParams;
  const query = q?.trim() ?? "";
  const sort: Sort = SORTS.some((s) => s.value === sortParam) ? (sortParam as Sort) : "best";
  const activeLang = LANGS.includes(lang) ? lang : "";
  const page = Math.min(MAX_PAGE, Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1));

  let repos: Awaited<ReturnType<typeof searchRepos>> = [];
  let error: string | null = null;
  if (query) {
    try {
      repos = await searchRepos(activeLang ? `${query} language:${activeLang}` : query, PER_PAGE, sort, page);
    } catch (e) {
      error = (e as Error).message;
    }
  }

  const hasNext = repos.length === PER_PAGE && page < MAX_PAGE;
  const from = (page - 1) * PER_PAGE + 1;

  return (
    <>
      <h1>Search</h1>

      <div className="search-sticky">
        <SearchBox initial={query} autoFocus={!query} />

        {query && (
          <div className="filters" aria-label="Filters">
            <div className="segmented" role="group" aria-label="Sort by">
              {SORTS.map((s) => (
                <Link
                  key={s.value}
                  href={href(query, s.value, activeLang)}
                  className={sort === s.value ? "is-active" : undefined}
                  aria-current={sort === s.value ? "true" : undefined}
                >
                  {s.label}
                </Link>
              ))}
            </div>
            <div className="chips scroll" role="group" aria-label="Language">
              <Link href={href(query, sort, "")} className={`chip chip-sm${!activeLang ? " is-active" : ""}`}>Any language</Link>
              {LANGS.map((l) => (
                <Link key={l} href={href(query, sort, l)} className={`chip chip-sm${activeLang === l ? " is-active" : ""}`}>
                  {l}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {!query && (
        <>
          <RecentSearches />
          <div className="notice">
            <span className="notice-icon"><SearchIcon /></span>
            <strong>Search all of GitHub</strong>
            <span>
              Try a topic like <Link href="/search?q=topic:nextjs">topic:nextjs</Link>, an author like{" "}
              <Link href="/search?q=user:vercel">user:vercel</Link>, or just describe it in words.
            </span>
          </div>
        </>
      )}

      {error && (
        <div className="notice error-box" role="alert">
          <strong>Couldn’t reach GitHub.</strong>
          <span>It limits how many searches we can make each hour. Give it a minute and try again.</span>
          <Link className="btn" href={href(query, sort, activeLang, page)}>Try again</Link>
        </div>
      )}

      {query && !error && repos.length === 0 && (
        <div className="notice">
          <span className="notice-icon"><SearchIcon /></span>
          <strong>{page > 1 ? "No more results." : `No repos found for “${query}”.`}</strong>
          <span>{page > 1 ? "That was the last page." : "Check the spelling, remove a filter, or let Ask figure out the right search."}</span>
          {page > 1 ? (
            <Link className="btn" href={href(query, sort, activeLang)}>Back to first page</Link>
          ) : (
            <Link className="btn primary" href={`/ask?q=${encodeURIComponent(query)}`}>Ask instead</Link>
          )}
        </div>
      )}

      {repos.length > 0 && <p className="muted result-count">Results {from}–{from + repos.length - 1}</p>}
      <div className="grid">
        {repos.map((r) => (
          <RepoCard key={r.fullName} repo={r} />
        ))}
      </div>

      {repos.length > 0 && (page > 1 || hasNext) && (
        <nav className="pager" aria-label="Pagination">
          {page > 1 ? <Link className="btn" href={href(query, sort, activeLang, page - 1)}>← Previous</Link> : <span />}
          <span className="muted">Page {page}</span>
          {hasNext ? <Link className="btn primary" href={href(query, sort, activeLang, page + 1)}>Next →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
