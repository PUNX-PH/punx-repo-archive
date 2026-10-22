export const DEFAULT_LIST = "Saved";
export const MAX_FOLDER_NAME = 40;

// Shown as one-tap starters when someone has few folders.
export const FOLDER_SUGGESTIONS = ["Java", "Design", "AI", "Tools", "Learning", "Inspiration"];

export const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Returns an error message, or null when the name is fine.
// `ignore` is the folder's current name when renaming, so keeping it (or changing only its case) is allowed.
export function validateFolderName(name: string, existing: string[], ignore?: string): string | null {
  const n = name.trim();
  if (!n) return "Give the folder a name.";
  if (n.length > MAX_FOLDER_NAME) return `Keep it under ${MAX_FOLDER_NAME} characters.`;
  if (sameName(n, "All")) return "“All” is reserved.";
  if (existing.some((e) => sameName(e, n) && !(ignore && sameName(e, ignore)))) return "You already have a folder with that name.";
  return null;
}
