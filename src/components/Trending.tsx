import { searchRepos } from "@/lib/github";
import { trendingQuery } from "@/lib/trending";
import { TrendingTabs } from "./TrendingTabs";

// The weekly list is fetched on the server so Home paints with content; other ranges load when picked.
export async function Trending() {
  let repos: Awaited<ReturnType<typeof searchRepos>> = [];
  try {
    repos = await searchRepos(trendingQuery("week"), 8, "stars");
  } catch {
    // The tabs component fetches again on its own, so a failure here just means a short loading state.
  }
  return <TrendingTabs initial={repos} />;
}
