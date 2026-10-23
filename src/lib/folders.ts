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

// ---- A saved repo can live in several folders ----
// Older saves only have one `list`; newer ones have `lists`. Always read folders through these helpers.

type HasLists = { list?: string; lists?: string[] };

/** Every folder a saved repo is in (never empty: falls back to the default folder). */
export function listsOf(b: HasLists): string[] {
  if (b.lists && b.lists.length > 0) return b.lists;
  return [b.list || DEFAULT_LIST];
}

export const inFolderOf = (b: HasLists, folder: string) => listsOf(b).some((l) => sameName(l, folder));

export const withFolder = (lists: string[], folder: string) => (lists.some((l) => sameName(l, folder)) ? lists : [...lists, folder]);

export const withoutFolder = (lists: string[], folder: string) => lists.filter((l) => !sameName(l, folder));

/** Case-insensitive de-duplication that keeps first spellings and order. */
export function uniqueFolders(lists: string[]): string[] {
  const out: string[] = [];
  for (const l of lists) if (l.trim() && !out.some((o) => sameName(o, l))) out.push(l);
  return out;
}

/** Short label for a card: "Java" or "Java +2". */
export function folderLabel(lists: string[]): string {
  return lists.length <= 1 ? (lists[0] ?? DEFAULT_LIST) : `${lists[0]} +${lists.length - 1}`;
}
