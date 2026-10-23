"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PREVIEW_MODE } from "@/lib/domain";
import { useAuth } from "./AuthProvider";
import { Logo, Nav } from "./Nav";
import { ThemeToggle } from "./ThemeToggle";

// Signed in: sidebar/tab bar plus content. Signed out: just the sign-in page, nothing to navigate to.
export function Shell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const showNav = Boolean(user) || PREVIEW_MODE;

  // Press "/" anywhere (outside a text field) to jump to search, like GitHub.
  useEffect(() => {
    if (!showNav) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      const field = document.querySelector<HTMLInputElement>('input[type="search"][aria-label="Search repositories"]');
      if (field) field.focus();
      else router.push("/search");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showNav, router]);

  return (
    <div className={`app${showNav ? "" : " no-nav"}`}>
      {showNav && <Nav user={user} />}
      <div className="main-col">
        <header className="topbar">
          <Logo />
          <ThemeToggle />
        </header>
        <main id="main" className="page">{children}</main>
      </div>
    </div>
  );
}
