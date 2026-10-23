import Link from "next/link";
import { HeroArt } from "@/components/HeroArt";

export default function NotFound() {
  return (
    <div className="lost">
      <HeroArt />
      <p className="eyebrow">Dead end</p>
      <h1>This branch doesn’t go anywhere.</h1>
      <p className="muted">We couldn’t find that page or repo. It may have been renamed, made private, or deleted on GitHub.</p>
      <div className="actions">
        <Link className="btn primary" href="/search">Search repos</Link>
        <Link className="btn" href="/">Go home</Link>
      </div>
    </div>
  );
}
