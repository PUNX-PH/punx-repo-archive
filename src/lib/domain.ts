export const ALLOWED_DOMAIN = "punx.ai";

/** Cookie that carries the Firebase ID token so the server can check who is asking. */
export const TOKEN_COOKIE = "punx_token";

export function isPunxEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

/**
 * Local-preview switch so the locked pages can be viewed without signing in.
 * Needs NEXT_PUBLIC_DEV_BYPASS_AUTH=1 AND a non-production build, and the env var lives only in an
 * untracked .env.development.local, so it can never be active on Vercel.
 */
export const PREVIEW_MODE = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "1";
