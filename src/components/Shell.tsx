"use client";

import { PREVIEW_MODE } from "@/lib/domain";
import { useAuth } from "./AuthProvider";
import { Logo, Nav } from "./Nav";
import { ThemeToggle } from "./ThemeToggle";

// Signed in: sidebar/tab bar plus content. Signed out: just the sign-in page, nothing to navigate to.
export function Shell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const showNav = Boolean(user) || PREVIEW_MODE;

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
