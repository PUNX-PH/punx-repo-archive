import { notFound } from "next/navigation";
import { BookmarkButton } from "@/components/BookmarkButton";
import { Readme } from "@/components/Readme";
import { formatStars } from "@/components/RepoCard";
import { getRepo } from "@/lib/github";

export default async function RepoPage({ params }: { params: Promise<{ owner: string; name: string }> }) {
  const { owner, name } = await params;
  const data = await getRepo(owner, name);
  if (!data) notFound();
  const { repo, readme, languages } = data;

  const total = Object.values(languages).reduce((a, b) => a + b, 0) || 1;
  const langs = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <>
      <div className="repo-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={repo.avatar} alt="" width={56} height={56} className="avatar" />
        <div>
          <h1>{repo.fullName}</h1>
          <p className="muted">{repo.description ?? "No description provided."}</p>
        </div>
      </div>

      <div className="meta big">
        <span>★ {formatStars(repo.stars)}</span>
        <span>⑂ {formatStars(repo.forks)}</span>
        <span>Updated {new Date(repo.updatedAt).toLocaleDateString()}</span>
      </div>

      <div className="actions">
        <BookmarkButton repo={repo} label />
        <a className="btn" href={repo.url} target="_blank" rel="noopener noreferrer">Open on GitHub ↗</a>
      </div>

      {repo.topics.length > 0 && (
        <div className="chips">
          {repo.topics.map((t) => (
            <a key={t} href={`/search?q=${encodeURIComponent(`topic:${t}`)}`} className="chip chip-sm">{t}</a>
          ))}
        </div>
      )}

      {langs.length > 0 && (
        <section>
          <h2>Languages</h2>
          <div className="langbar" aria-hidden="true">
            {langs.map(([l, n], i) => (
              <span key={l} style={{ width: `${(n / total) * 100}%` }} className={`lang lang-${i}`} />
            ))}
          </div>
          <ul className="langlist">
            {langs.map(([l, n], i) => (
              <li key={l}><span className={`dot lang-${i}`} />{l} {Math.round((n / total) * 100)}%</li>
            ))}
          </ul>
        </section>
      )}

      {readme && (
        <section>
          <h2>README</h2>
          <Readme source={readme} owner={repo.owner} name={repo.name} />
        </section>
      )}
    </>
  );
}
