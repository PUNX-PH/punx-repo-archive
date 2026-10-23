"use client";

import { useEffect } from "react";
import type { Repo } from "@/lib/types";
import { rememberViewed } from "@/lib/viewed";

// Renders nothing; just notes that this repo page was opened.
export function TrackView({ repo }: { repo: Repo }) {
  useEffect(() => rememberViewed(repo), [repo]);
  return null;
}
