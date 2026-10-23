import Link from "next/link";
import { languageColor } from "@/lib/languages";
import type { Repo } from "@/lib/types";
import { BookmarkButton } from "./BookmarkButton";
import { StarIcon } from "./Icons";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function formatStars(n: number) {
  return compact.format(n);
}

export function RepoCard({ repo }: { repo: Repo }) {
  return (
    <article className="repo-card">
      <Link href={`/repo/${repo.owner}/${repo.name}`} className="repo-card-link">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={repo.avatar} alt="" width={44} height={44} className="avatar" />
        <div className="repo-card-body">
          <h3 translate="no"><span className="owner">{repo.owner}/</span>{repo.name}</h3>
          <p className="desc">{repo.description ?? "No description provided."}</p>
          <div className="meta">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <StarIcon /> {formatStars(repo.stars)}
            </span>
            {repo.language && (
              <span className="lang">
                <span className="dot" style={{ background: languageColor(repo.language) }} />
                {repo.language}
              </span>
            )}
            {repo.topics.slice(0, 2).map((t) => (
              <span key={t} className="chip chip-sm">{t}</span>
            ))}
          </div>
        </div>
      </Link>
      <BookmarkButton repo={repo} />
    </article>
  );
}
