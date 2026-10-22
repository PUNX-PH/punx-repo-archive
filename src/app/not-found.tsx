import Link from "next/link";

export default function NotFound() {
  return (
    <div className="notice">
      <strong>We couldn’t find that page or repo.</strong>
      <span>It may have been renamed, made private, or deleted on GitHub.</span>
      <div className="actions">
        <Link className="btn primary" href="/search">Search repos</Link>
        <Link className="btn" href="/">Go home</Link>
      </div>
    </div>
  );
}
