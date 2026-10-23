"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

const tabs = [
  { href: "/", label: "Home", d: "M3 11l9-8 9 8v10h-6v-6H9v6H3z" },
  { href: "/search", label: "Search", d: "M11 4a7 7 0 105 12l5 5M11 4a7 7 0 010 14" },
  { href: "/ask", label: "Ask", d: "M4 5h16v11H9l-5 4z" },
  { href: "/library", label: "Library", d: "M5 4h4v16H5zM11 4h4v16h-4zM17 6l3 1-3 13-3-1z" },
  { href: "/profile", label: "Profile", d: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" },
];

export function TabBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  // Nothing to navigate to until someone is signed in.
  if (!user) return null;
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map((t) => {
        const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={active ? "tab is-active" : "tab"} aria-current={active ? "page" : undefined}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={t.d} />
            </svg>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
