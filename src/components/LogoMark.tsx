// The Punx Repo Archive mark: a folder (the archive) holding the X from PUNX drawn as two crossing
// branches with commit dots at the ends, like a git graph. Same artwork as src/app/icon.svg.
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path
        d="M6 14a6 6 0 016-6h13l6 7h21a6 6 0 016 6v29a6 6 0 01-6 6H12a6 6 0 01-6-6z"
        fill="#111"
        stroke="#fff"
        strokeOpacity=".42"
        strokeWidth="1.5"
      />
      <path d="M21 28L43 46M43 28L21 46" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <circle cx="21" cy="28" r="4.6" fill="#f26a3d" stroke="#111" strokeWidth="2" />
      <circle cx="43" cy="28" r="4.6" fill="#fff" stroke="#111" strokeWidth="2" />
      <circle cx="21" cy="46" r="4.6" fill="#fff" stroke="#111" strokeWidth="2" />
      <circle cx="43" cy="46" r="4.6" fill="#f26a3d" stroke="#111" strokeWidth="2" />
    </svg>
  );
}
