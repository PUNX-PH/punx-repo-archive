import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BookmarkButton } from "@/components/BookmarkButton";
import { Readme } from "@/components/Readme";
import { formatStars } from "@/components/RepoCard";
import { getRepo } from "@/lib/github";
import { languageColor } from "@/lib/languages";

type Props = { params: Promise<{ owner: string; name: string }> };

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  if (!iso || Number.isNaN(days)) return "-";
  if (days < 1) return "Today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { owner, name } = await params;
  return { title: `${owner}/${name}` };
}

export default async function RepoPage({ params }: Props) {
  const { owner, name } = await params;
  const data = await getRepo(owner, name);
  if (!data) notFound();
  const { repo, readme, languages } = data;

  const total = Object.values(languages).reduce((a, b) => a + b, 0) || 1;
  // Hide languages under 1%, which would just read as "0%".
  const langs = Object.entries(languages)
    .filter(([, n]) => n / total >= 0.01)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <>
      <div className="repo-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={repo.avatar} alt="" width={64} height={64} className="avatar" />
        <h1 translate="no"><span className="owner">{repo.owner}/</span>{repo.name}</h1>
      </div>
      <p className="muted repo-desc">{repo.description ?? "No description provided."}</p>

      <div className="stats">
        <div className="stat"><strong>{formatStars(repo.stars)}</strong><span>Stars</span></div>
        <div className="stat"><strong>{formatStars(repo.forks)}</strong><span>Forks</span></div>
        <div className="stat"><strong>{timeAgo(repo.updatedAt)}</strong><span>Last updated</span></div>
      </div>

      <div className="actions">
        <BookmarkButton repo={repo} label />
        <a className="btn primary" href={repo.url} target="_blank" rel="noopener noreferrer">Open on GitHub ↗</a>
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
            {langs.map(([l, n]) => (
              <span key={l} style={{ width: `${(n / total) * 100}%`, background: languageColor(l) }} />
            ))}
          </div>
          <ul className="langlist">
            {langs.map(([l, n]) => (
              <li key={l}><span className="dot" style={{ background: languageColor(l) }} />{l} {Math.round((n / total) * 100)}%</li>
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
