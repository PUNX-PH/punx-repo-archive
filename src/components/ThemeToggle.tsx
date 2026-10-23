"use client";

import { useEffect, useState } from "react";
import { THEME_EVENT, THEME_LABEL, cycleTheme, getTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  // There can be several controls on screen (top bar, sidebar, command palette, profile), so stay in step.
  useEffect(() => {
    setTheme(getTheme());
    const sync = () => setTheme(getTheme());
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(cycleTheme())}
      aria-label={`Theme: ${THEME_LABEL[theme]}. Click to change.`}
      title={`Theme: ${THEME_LABEL[theme]}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {theme === "light" && (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        )}
        {theme === "dark" && <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />}
        {theme === "system" && (
          <>
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M8 20h8M12 16v4" />
          </>
        )}
      </svg>
      <span>{THEME_LABEL[theme]}</span>
    </button>
  );
}
