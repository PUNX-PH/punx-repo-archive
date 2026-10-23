// Decorative git-graph: branches that split and merge, in the same language as the logo.
export function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 320 200" fill="none" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeOpacity=".28" strokeWidth="3" strokeLinecap="round">
        <path d="M10 100H310" />
        <path d="M60 100C92 100 88 50 122 50H198C232 50 228 100 260 100" />
        <path d="M110 100C140 100 134 150 166 150H236C262 150 262 100 290 100" />
      </g>
      <g>
        <circle className="hero-dot d1" cx="60" cy="100" r="7" fill="currentColor" />
        <circle className="hero-dot d2" cx="122" cy="50" r="7" fill="var(--text)" fillOpacity=".85" />
        <circle className="hero-dot d3" cx="198" cy="50" r="7" fill="currentColor" />
        <circle className="hero-dot d4" cx="260" cy="100" r="7" fill="var(--text)" fillOpacity=".85" />
        <circle className="hero-dot d5" cx="166" cy="150" r="7" fill="currentColor" />
        <circle className="hero-dot d6" cx="236" cy="150" r="7" fill="var(--text)" fillOpacity=".85" />
        <circle className="hero-dot d7" cx="310" cy="100" r="9" fill="currentColor" />
      </g>
    </svg>
  );
}
