import Link from "next/link";
import { Greeting } from "@/components/Greeting";
import { FolderIcon } from "@/components/FolderPicker";
import { SparkIcon } from "@/components/Icons";
import { LibraryPeek } from "@/components/LibraryPeek";
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
      <div className="hero">
        <Greeting />
        <p className="hero-sub">Search GitHub, ask if something already exists, and keep what you find in folders your team can share.</p>
        <SearchBox />
        <div className="chips scroll" aria-label="Quick searches">
          {SHORTCUTS.map((s) => (
            <Link key={s.label} href={`/search?q=${encodeURIComponent(s.q)}`} className="chip">{s.label}</Link>
          ))}
        </div>
      </div>

      <div className="quick-grid">
        <Link href="/ask" className="quick accent">
          <span className="quick-icon"><SparkIcon /></span>
          <span>
            <strong>Ask instead of searching</strong>
            <span className="sub">Describe your idea, we check if a repo exists</span>
          </span>
        </Link>
        <Link href="/library" className="quick">
          <span className="quick-icon"><FolderIcon /></span>
          <span>
            <strong>Your library</strong>
            <LibraryPeek />
          </span>
        </Link>
      </div>

      <RecentlySaved />
      <Trending />
    </>
  );
}
