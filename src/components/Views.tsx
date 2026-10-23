"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { recordView } from "@/lib/views";
import { useAuth } from "./AuthProvider";

// Live view count for a stats key. Pass record to also count this visit.
export function useViews(statKey: string, record = false): number | null {
  const { user } = useAuth();
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    if (!db || !user) return;
    if (record) recordView(statKey);
    return onSnapshot(
      doc(db, "stats", statKey),
      (snap) => setViews(snap.exists() ? Number(snap.data().views) || 0 : 0),
      () => setViews(null),
    );
  }, [user, statKey, record]);

  return views;
}

const nf = new Intl.NumberFormat("en");

export function ViewStat({ statKey, label = "Team views" }: { statKey: string; label?: string }) {
  const views = useViews(statKey, true);
  return (
    <div className="stat">
      <strong>{views === null ? "-" : nf.format(views)}</strong>
      <span>{label}</span>
    </div>
  );
}

export function ViewCount({ statKey, record = false }: { statKey: string; record?: boolean }) {
  const views = useViews(statKey, record);
  if (views === null) return null;
  return <span>{nf.format(views)} view{views === 1 ? "" : "s"}</span>;
}
