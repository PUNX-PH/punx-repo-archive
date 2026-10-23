export const ALLOWED_DOMAIN = "punx.ai";

/** Cookie that carries the Firebase ID token so the server can check who is asking. */
export const TOKEN_COOKIE = "punx_token";

export function isPunxEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}
