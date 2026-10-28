/** Copies text to the clipboard. Returns false when the browser refuses (blocked, or an insecure page). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** The link to open one file inside the app, like a Google Drive link. Only people with access can open it. */
export const appLink = (origin: string, id: string) => `${origin}/files/${id}`;

/** An HTML page that anyone with this link can open without signing in. */
export const publicLink = (origin: string, id: string) => `${origin}/p/${id}`;

/** The link to hand out for a file: the public page when it has one, otherwise the in-app link. */
export const fileLink = (origin: string, file: { id: string; public?: boolean }) =>
  file.public ? publicLink(origin, file.id) : appLink(origin, file.id);
