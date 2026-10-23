"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "firebase/auth";
import { LogoMark } from "./LogoMark";
import { ThemeToggle } from "./ThemeToggle";

const ICONS = {
  home: "M3 11l9-8 9 8v10h-6v-6H9v6H3z",
  search: "M11 4a7 7 0 105 12l5 5M11 4a7 7 0 010 14",
  ask: "M4 5h16v11H9l-5 4z",
  library: "M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  profile: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
};

const TABS = [
  { href: "/", label: "Home", icon: ICONS.home },
  { href: "/search", label: "Search", icon: ICONS.search },
  { href: "/ask", label: "Ask", icon: ICONS.ask },
  { href: "/library", label: "Library", icon: ICONS.library },
  { href: "/profile", label: "Profile", icon: ICONS.profile, mobileOnly: true },
];

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Punx Repo Archive, home">
      <span className="logo-mark"><LogoMark size={32} /></span>
      <span className="logo-text" translate="no">punx<span>/archive</span></span>
    </Link>
  );
}

// One <nav>: a bottom tab bar on phones, a left sidebar on desktop.
export function Nav({ user }: { user: User | null }) {
  const pathname = usePathname();
  const name = user?.displayName ?? user?.email ?? "Preview";
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <nav className="nav" aria-label="Main">
      <div className="nav-brand"><Logo /></div>

      <div className="nav-items">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`tab${active ? " is-active" : ""}${t.mobileOnly ? " tab-mobile" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={t.icon} />
              </svg>
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="nav-foot">
        <Link href="/profile" className="user-chip">
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="" width={32} height={32} referrerPolicy="no-referrer" />
          ) : (
            <span className="user-initial" aria-hidden="true">{initial}</span>
          )}
          <span className="user-meta">
            <strong>{name}</strong>
            {user?.displayName && user.email && <small>{user.email}</small>}
          </span>
        </Link>
        <ThemeToggle />
      </div>
    </nav>
  );
}
