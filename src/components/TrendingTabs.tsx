"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RANGES, isRange, trendingQuery, type RangeId } from "@/lib/trending";
import type { Repo } from "@/lib/types";
import { RepoCard } from "./RepoCard";

const KEY = "punx.trending-range";

// Trending with a range switch. The weekly list arrives with the page; the others load on first click.
export function TrendingTabs({ initial }: { initial: Repo[] }) {
  const [range, setRange] = useState<RangeId>("week");
  const [data, setData] = useState<Partial<Record<RangeId, Repo[]>>>(initial.length ? { week: initial } : {});
  const [failed, setFailed] = useState<RangeId | null>(null);
  const [tries, setTries] = useState(0);

  // Remember the last range you looked at on this device.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (isRange(saved)) setRange(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (data[range]) return;
    let cancelled = false;
    setFailed(null);
    fetch(`/api/trending?range=${range}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "failed");
        if (!cancelled) setData((d) => ({ ...d, [range]: body.repos as Repo[] }));
      })
      .catch(() => !cancelled && setFailed(range));
    return () => {
      cancelled = true;
    };
    // `tries` re-runs this after a failure when the user presses Try again.
  }, [range, data, tries]);

  function choose(r: RangeId) {
    setRange(r);
    try {
      localStorage.setItem(KEY, r);
    } catch {}
  }

  const current = RANGES.find((r) => r.id === range)!;
  const repos = data[range];
  const q = trendingQuery(range);

  return (
    <section>
      <div className="section-head">
        <h2>Trending</h2>
        <Link href={`/search?q=${encodeURIComponent(q)}&sort=stars`}>See more</Link>
      </div>

      <div className="segmented" role="tablist" aria-label="Trending range">
        {RANGES.map((r) => (
          <button key={r.id} role="tab" aria-selected={range === r.id} className={range === r.id ? "is-active" : undefined} onClick={() => choose(r.id)}>
            {r.label}
          </button>
        ))}
      </div>
      <p className="muted" style={{ margin: "10px 0 0", fontSize: "0.9rem" }}>{current.blurb}</p>

      {repos ? (
        repos.length > 0 ? (
          <div className="grid">
            {repos.map((r) => (
              <RepoCard key={r.fullName} repo={r} />
            ))}
          </div>
        ) : (
          <div className="notice">
            <strong>Nothing trending {range === "day" ? "today" : "for this range"} yet.</strong>
            <span>Try a longer range, or check back later.</span>
          </div>
        )
      ) : failed === range ? (
        <div className="notice error-box" role="alert">
          <strong>Couldn’t load trending.</strong>
          <span>GitHub limits how often we can ask. Give it a minute and try again.</span>
          <button className="btn" onClick={() => { setFailed(null); setTries((t) => t + 1); }}>Try again</button>
        </div>
      ) : (
        <div className="grid" aria-busy="true" aria-label="Loading trending repos">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="repo-card skeleton-card">
              <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 10 }} />
              <div style={{ flex: 1, marginLeft: 8 }}>
                <div className="skeleton" style={{ width: "55%", height: 16 }} />
                <div className="skeleton" style={{ width: "90%", height: 12, marginTop: 10 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
