import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CloneBox } from "@/components/CloneBox";
import { Readme } from "@/components/Readme";
import { RepoActions } from "@/components/RepoActions";
import { RepoCard, formatStars } from "@/components/RepoCard";
import { TrackView } from "@/components/TrackView";
import { ViewStat } from "@/components/Views";
import { getRelated, getRepo } from "@/lib/github";
import { languageColor } from "@/lib/languages";
import { timeAgo } from "@/lib/time";
import { repoStatKey } from "@/lib/views";

type Props = { params: Promise<{ owner: string; name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { owner, name } = await params;
  return { title: `${owner}/${name}` };
}

export default async function RepoPage({ params }: Props) {
  const { owner, name } = await params;
  const data = await getRepo(owner, name);
  if (!data) notFound();
  const { repo, readme, languages, extra } = data;
  const related = await getRelated(repo);

  const total = Object.values(languages).reduce((a, b) => a + b, 0) || 1;
  // Hide languages under 1%, which would just read as "0%".
  const langs = Object.entries(languages)
    .filter(([, n]) => n / total >= 0.01)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <>
      <TrackView repo={repo} />
      <div className="repo-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={repo.avatar} alt="" width={64} height={64} className="avatar" />
        <h1 translate="no"><span className="owner">{repo.owner}/</span>{repo.name}</h1>
      </div>
      <p className="muted repo-desc">{repo.description ?? "No description provided."}</p>

      {extra.archived && (
        <p className="notice-inline" role="note">This repo is archived on GitHub, so it’s read-only and may not be maintained.</p>
      )}

      <div className="stats">
        <div className="stat"><strong>{formatStars(repo.stars)}</strong><span>Stars</span></div>
        <div className="stat"><strong>{formatStars(repo.forks)}</strong><span>Forks</span></div>
        <div className="stat"><strong>{formatStars(extra.openIssues)}</strong><span>Open issues</span></div>
        <div className="stat"><strong>{timeAgo(repo.updatedAt)}</strong><span>Last updated</span></div>
        <ViewStat statKey={repoStatKey(repo.owner, repo.name)} />
      </div>

      <RepoActions repo={repo} />

      {(extra.license || extra.homepage || repo.topics.length > 0) && (
        <div className="chips">
          {extra.license && <span className="chip chip-sm chip-license" title="License">{extra.license}</span>}
          {extra.homepage && (
            <a href={extra.homepage} target="_blank" rel="noopener noreferrer" className="chip chip-sm">Website ↗</a>
          )}
          {repo.topics.map((t) => (
            <a key={t} href={`/search?q=${encodeURIComponent(`topic:${t}`)}`} className="chip chip-sm">{t}</a>
          ))}
        </div>
      )}

      <CloneBox owner={repo.owner} name={repo.name} />

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

      {related.length > 0 && (
        <section>
          <h2>More like this</h2>
          <p className="muted" style={{ margin: "2px 0 0", fontSize: "0.9rem" }}>Popular repos tagged “{repo.topics[0]}”.</p>
          <div className="grid">
            {related.map((r) => (
              <RepoCard key={r.fullName} repo={r} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
