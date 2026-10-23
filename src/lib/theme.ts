// Theme (light/dark/auto) and accent color, kept in localStorage and mirrored onto <html> as
// data-theme / data-accent. The inline script in layout.tsx applies both before first paint.

export type Theme = "system" | "light" | "dark";
export const THEMES: Theme[] = ["system", "light", "dark"];
export const THEME_LABEL: Record<Theme, string> = { system: "Auto", light: "Light", dark: "Dark" };

export const ACCENTS = [
  { id: "orange", label: "Orange", swatch: "#e4572e" },
  { id: "blue", label: "Blue", swatch: "#3b6df0" },
  { id: "green", label: "Green", swatch: "#1f9d55" },
  { id: "violet", label: "Violet", swatch: "#7c4ddb" },
  { id: "rose", label: "Rose", swatch: "#d62c5c" },
] as const;
export type Accent = (typeof ACCENTS)[number]["id"];

export const THEME_EVENT = "punx-theme";

const THEME_KEY = "punx.theme";
const ACCENT_KEY = "punx.accent";

export function getTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

export function setTheme(t: Theme) {
  const root = document.documentElement;
  if (t === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", t);
  try {
    if (t === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, t);
  } catch {}
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function cycleTheme(): Theme {
  const next = THEMES[(THEMES.indexOf(getTheme()) + 1) % THEMES.length];
  setTheme(next);
  return next;
}

export function getAccent(): Accent {
  try {
    const saved = localStorage.getItem(ACCENT_KEY);
    return ACCENTS.some((a) => a.id === saved) ? (saved as Accent) : "orange";
  } catch {
    return "orange";
  }
}

export function setAccent(a: Accent) {
  const root = document.documentElement;
  if (a === "orange") root.removeAttribute("data-accent");
  else root.setAttribute("data-accent", a);
  try {
    if (a === "orange") localStorage.removeItem(ACCENT_KEY);
    else localStorage.setItem(ACCENT_KEY, a);
  } catch {}
  window.dispatchEvent(new Event(THEME_EVENT));
}
