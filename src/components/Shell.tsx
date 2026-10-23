"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PREVIEW_MODE } from "@/lib/domain";
import { useAuth } from "./AuthProvider";
import { CommandPalette } from "./CommandPalette";
import { SearchIcon } from "./Icons";
import { Logo, Nav } from "./Nav";
import { ThemeToggle } from "./ThemeToggle";

// Signed in: sidebar/tab bar plus content. Signed out: just the sign-in page, nothing to navigate to.
export function Shell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const showNav = Boolean(user) || PREVIEW_MODE;
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (!showNav) return;
    const onKey = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K opens quick find from anywhere, even inside a text field.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      // "/" outside a text field jumps to search, like GitHub.
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
      {showNav && <Nav user={user} onQuickFind={() => setPaletteOpen(true)} />}
      <div className="main-col">
        <header className="topbar">
          <Logo />
          <div className="topbar-actions">
            {showNav && (
              <button className="icon-btn" onClick={() => setPaletteOpen(true)} aria-label="Quick find">
                <SearchIcon size={18} />
              </button>
            )}
            <ThemeToggle />
          </div>
        </header>
        <main id="main" className="page">{children}</main>
      </div>
      {showNav && <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}
