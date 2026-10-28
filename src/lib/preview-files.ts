import type { ArchiveFile } from "./files";

/**
 * Local-preview only (PREVIEW_MODE, no sign-in): files live in memory, so the file page can find them after navigating
 * away from the list. Never used when signed in.
 */
export const previewFiles = new Map<string, { file: ArchiveFile; url: string }>();
