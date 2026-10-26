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
};

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
