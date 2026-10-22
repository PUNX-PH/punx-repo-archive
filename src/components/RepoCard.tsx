import Link from "next/link";
import type { Repo } from "@/lib/types";
import { BookmarkButton } from "./BookmarkButton";

export function formatStars(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

export function RepoCard({ repo }: { repo: Repo }) {
  return (
    <article className="repo-card">
      <Link href={`/repo/${repo.owner}/${repo.name}`} className="repo-card-link">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={repo.avatar} alt="" width={44} height={44} className="avatar" />
        <div className="repo-card-body">
          <h3>{repo.fullName}</h3>
          <p>{repo.description ?? "No description provided."}</p>
          <div className="meta">
            <span>★ {formatStars(repo.stars)}</span>
            {repo.language && <span>{repo.language}</span>}
            {repo.topics.slice(0, 3).map((t) => (
              <span key={t} className="chip chip-sm">{t}</span>
            ))}
          </div>
        </div>
      </Link>
      <BookmarkButton repo={repo} />
    </article>
  );
}
