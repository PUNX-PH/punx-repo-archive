"use client";

import { useEffect, useState } from "react";
import { ACCENTS, THEMES, THEME_EVENT, THEME_LABEL, getAccent, getTheme, setAccent, setTheme, type Accent, type Theme } from "@/lib/theme";
import { CheckIcon } from "./Icons";

const THEME_HINT: Record<Theme, string> = {
  system: "Follows your device",
  light: "Bright and warm",
  dark: "Easy on the eyes",
};

// Theme and accent color, saved on this device. Changes apply instantly.
export function AppearanceSettings() {
  const [theme, setT] = useState<Theme>("system");
  const [accent, setA] = useState<Accent>("orange");

  useEffect(() => {
    const sync = () => {
      setT(getTheme());
      setA(getAccent());
    };
    sync();
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  return (
    <section id="appearance">
      <h2>Appearance</h2>
      <p className="muted" style={{ margin: "4px 0 10px", fontSize: "0.9rem" }}>Saved on this device.</p>

      <div className="choice-grid" role="radiogroup" aria-label="Theme">
        {THEMES.map((t) => (
          <button key={t} role="radio" aria-checked={theme === t} className={`choice choice-${t}${theme === t ? " is-active" : ""}`} onClick={() => setTheme(t)}>
            <span className="choice-preview" aria-hidden="true">
              <span /><span /><span />
            </span>
            <strong>{THEME_LABEL[t]}</strong>
            <small>{THEME_HINT[t]}</small>
          </button>
        ))}
      </div>

      <div className="swatches" role="radiogroup" aria-label="Accent color">
        {ACCENTS.map((a) => (
          <button
            key={a.id}
            role="radio"
            aria-checked={accent === a.id}
            aria-label={a.label}
            title={a.label}
            className={`swatch${accent === a.id ? " is-active" : ""}`}
            style={{ background: a.swatch }}
            onClick={() => setAccent(a.id)}
          >
            {accent === a.id && <CheckIcon size={16} />}
          </button>
        ))}
      </div>
    </section>
  );
}
