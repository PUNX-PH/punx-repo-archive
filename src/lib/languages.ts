// GitHub's language colors for the common cases; anything else gets a neutral dot.
const COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572a5",
  Go: "#00add8",
  Rust: "#dea584",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4f5d95",
  Swift: "#f05138",
  Kotlin: "#a97bff",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Dart: "#00b4ab",
  Lua: "#000080",
  Zig: "#ec915c",
  "Jupyter Notebook": "#da5b0b",
};

export const languageColor = (lang: string | null) => (lang && COLORS[lang]) || "#8b8680";
