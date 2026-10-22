import Link from "next/link";
import { RecentlySaved } from "@/components/RecentlySaved";
import { SearchBox } from "@/components/SearchBox";
import { Trending } from "@/components/Trending";

const SHORTCUTS = [
  { label: "AI agents", q: "topic:ai-agents" },
  { label: "Claude Code", q: "claude code skills" },
  { label: "Next.js", q: "topic:nextjs stars:>500" },
  { label: "CLI tools", q: "topic:cli stars:>1000" },
  { label: "Self-hosted", q: "topic:self-hosted stars:>1000" },
];

export default function Home() {
  return (
    <>
      <h1 className="hero-title">Find the repo<br />before you build it.</h1>
      <SearchBox />

      <div className="chips" aria-label="Quick searches">
        {SHORTCUTS.map((s) => (
          <Link key={s.label} href={`/search?q=${encodeURIComponent(s.q)}`} className="chip">{s.label}</Link>
        ))}
      </div>

      <Link href="/ask" className="ask-banner">
        <strong>Not sure what to search for?</strong>
        <span>Describe your idea and we’ll check if a repo already exists →</span>
      </Link>

      <RecentlySaved />
      <Trending />
    </>
  );
}
