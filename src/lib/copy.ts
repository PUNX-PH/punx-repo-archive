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
export const fileLink = (origin: string, id: string) => `${origin}/files/${id}`;
