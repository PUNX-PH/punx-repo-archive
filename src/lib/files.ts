import { sameName } from "./folders";

export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_FILE_NAME = 120;

/** What a file is, for the filter chips and the badge on its card. */
export type FileKind = "image" | "slides" | "sheet" | "doc" | "pdf" | "media" | "other";

export const KINDS: { id: FileKind; label: string }[] = [
  { id: "image", label: "Images" },
  { id: "slides", label: "Slides" },
  { id: "sheet", label: "Sheets" },
  { id: "doc", label: "Docs" },
  { id: "pdf", label: "PDFs" },
  { id: "media", label: "Audio & video" },
  { id: "other", label: "Other" },
];

/** A file someone archived. Everyone on the team can see these; only the uploader can rename or delete. */
export type ArchiveFile = {
  id: string;
  name: string;
  size: number;
  contentType: string;
  kind: FileKind;
  /** Where the bytes live in Firebase Storage. */
  path: string;
  uploaderUid: string;
  uploaderName: string;
  /** Milliseconds since the epoch. */
  createdAt: number;
  /** The team folder it is filed in. Empty (or missing, on older files) means "Unfiled". */
  folder?: string;
};

export const folderOf = (f: { folder?: string }) => f.folder?.trim() ?? "";

/** What the page is showing: everything, files with no folder, or one folder. */
export type FolderView = { type: "all" } | { type: "unfiled" } | { type: "folder"; name: string };

export const inView = (f: { folder?: string }, v: FolderView) =>
  v.type === "all" ? true : v.type === "unfiled" ? folderOf(f) === "" : sameName(folderOf(f), v.name);

export type FileSort = "new" | "old" | "name" | "big" | "small";
export type AgeFilter = "any" | "day" | "week" | "month";

export type FileFilters = {
  query: string;
  kind: FileKind | "all";
  /** "all", "me", or an uploader's uid. */
  uploader: string;
  age: AgeFilter;
  sort: FileSort;
};

export const NO_FILTERS: FileFilters = { query: "", kind: "all", uploader: "all", age: "any", sort: "new" };

export const SORTS: { id: FileSort; label: string }[] = [
  { id: "new", label: "Newest first" },
  { id: "old", label: "Oldest first" },
  { id: "name", label: "Name A–Z" },
  { id: "big", label: "Largest first" },
  { id: "small", label: "Smallest first" },
];

export const AGES: { id: AgeFilter; label: string; days: number }[] = [
  { id: "any", label: "Any time", days: 0 },
  { id: "day", label: "Today", days: 1 },
  { id: "week", label: "Past 7 days", days: 7 },
  { id: "month", label: "Past 30 days", days: 30 },
];

/** How many filters (other than sort) are narrowing the list. */
export const activeFilterCount = (f: FileFilters) =>
  (f.query.trim() ? 1 : 0) + (f.kind !== "all" ? 1 : 0) + (f.uploader !== "all" ? 1 : 0) + (f.age !== "any" ? 1 : 0);

/** Applies the folder view, every filter and the sort. Search looks at name, extension, person and folder. */
export function filterFiles(files: ArchiveFile[], view: FolderView, f: FileFilters, me: string | null, now = Date.now()): ArchiveFile[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  const since = AGES.find((a) => a.id === f.age)!.days;
  const who = f.uploader === "me" ? me : f.uploader;

  const out = files.filter((file) => {
    if (!inView(file, view)) return false;
    if (f.kind !== "all" && file.kind !== f.kind) return false;
    if (f.uploader !== "all" && file.uploaderUid !== who) return false;
    if (since && now - file.createdAt > since * 864e5) return false;
    if (words.length) {
      const hay = `${file.name} ${file.uploaderName} ${folderOf(file)} ${extOf(file.name)}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });

  const by: Record<FileSort, (a: ArchiveFile, b: ArchiveFile) => number> = {
    new: (a, b) => b.createdAt - a.createdAt,
    old: (a, b) => a.createdAt - b.createdAt,
    name: (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }),
    big: (a, b) => b.size - a.size,
    small: (a, b) => a.size - b.size,
  };
  return out.sort(by[f.sort]);
}


const BY_EXT: Record<string, FileKind> = {
  ppt: "slides", pptx: "slides", pps: "slides", ppsx: "slides", key: "slides", odp: "slides",
  xls: "sheet", xlsx: "sheet", xlsm: "sheet", csv: "sheet", tsv: "sheet", numbers: "sheet", ods: "sheet",
  doc: "doc", docx: "doc", txt: "doc", md: "doc", rtf: "doc", odt: "doc", pages: "doc",
  pdf: "pdf",
  mp3: "media", wav: "media", m4a: "media", mp4: "media", mov: "media", webm: "media", mkv: "media",
};

// Programs are not archive material, and opening one from a team link is a bad idea.
const BLOCKED = new Set(["exe", "msi", "bat", "cmd", "com", "scr", "ps1", "vbs", "jar", "dll", "apk", "app", "dmg"]);

export function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 && i < name.length - 1 ? name.slice(i + 1).toLowerCase() : "";
}

export function kindOf(name: string, contentType: string): FileKind {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("audio/") || contentType.startsWith("video/")) return "media";
  return BY_EXT[extOf(name)] ?? "other";
}

/** Why this file can't be uploaded, or null when it's fine. */
export function rejectReason(file: { name: string; size: number }): string | null {
  if (BLOCKED.has(extOf(file.name))) return `${file.name}: programs can’t be archived.`;
  if (file.size === 0) return `${file.name}: the file is empty.`;
  if (file.size > MAX_FILE_BYTES) return `${file.name}: over the ${formatBytes(MAX_FILE_BYTES)} limit (${formatBytes(file.size)}).`;
  return null;
}

/** Storage object names can't contain slashes. */
export const storageName = (name: string) => name.replace(/[\\/]/g, "_");

export function validateFileName(name: string): string | null {
  const n = name.trim();
  if (!n) return "Give the file a name.";
  if (n.length > MAX_FILE_NAME) return `Keep it under ${MAX_FILE_NAME} characters.`;
  if (/[\\/]/.test(n)) return "Names can’t contain slashes.";
  return null;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let v = n / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return `${v >= 100 || Number.isInteger(v) ? Math.round(v) : v.toFixed(1)} ${units[u]}`;
}

export function formatWhen(ms: number): string {
  const days = Math.floor((Date.now() - ms) / 864e5);
  if (days < 1) return "Today";
  if (days < 30) return `${days}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: days < 365 ? undefined : "numeric" });
}

export function newFileId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
