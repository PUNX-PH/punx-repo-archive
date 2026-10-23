"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";

const ORDER: Theme[] = ["system", "light", "dark"];
const LABEL: Record<Theme, string> = { system: "Auto", light: "Light", dark: "Dark" };
const EVENT = "punx-theme";

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

function read(): Theme {
  try {
    const saved = localStorage.getItem("punx.theme");
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  // There can be two toggles on screen (top bar and sidebar), so keep them in step.
  useEffect(() => {
    setTheme(read());
    const sync = () => setTheme(read());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  function next() {
    const t = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    apply(t);
    try {
      if (t === "system") localStorage.removeItem("punx.theme");
      else localStorage.setItem("punx.theme", t);
    } catch {}
    setTheme(t);
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button className="theme-toggle" onClick={next} aria-label={`Theme: ${LABEL[theme]}. Click to change.`} title={`Theme: ${LABEL[theme]}`}>
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
      <span>{LABEL[theme]}</span>
    </button>
  );
}
