"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { languageColor } from "@/lib/languages";
import { readViewed, type ViewedRepo } from "@/lib/viewed";
import { StarIcon } from "./Icons";
import { formatStars } from "./RepoCard";

export function RecentlyViewed() {
  const [items, setItems] = useState<ViewedRepo[]>([]);
  useEffect(() => setItems(readViewed().slice(0, 6)), []);
  if (items.length === 0) return null;

  return (
    <section>
      <div className="section-head">
        <h2>Pick up where you left off</h2>
      </div>
      <div className="carousel">
        {items.map((r) => (
          <Link key={r.fullName} href={`/repo/${r.owner}/${r.name}`} className="tile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.avatar} alt="" width={40} height={40} className="avatar" />
            <h3 translate="no">{r.name}</h3>
            <p>{r.description ?? "No description."}</p>
            <span className="meta">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><StarIcon /> {formatStars(r.stars)}</span>
              {r.language && <span className="lang"><span className="dot" style={{ background: languageColor(r.language) }} />{r.language}</span>}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
