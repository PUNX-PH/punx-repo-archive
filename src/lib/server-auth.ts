import { createRemoteJWKSet, jwtVerify } from "jose";
import { PREVIEW_MODE, TOKEN_COOKIE, isPunxEmail } from "./domain";

// Firebase ID tokens are signed with Google's rotating keys, so no secret is needed to check one.
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export type Member = { email: string; uid: string };

/** Returns the member if the token is a valid, unexpired Firebase token for a verified @punx.ai Google account. */
export async function verifyPunxToken(token: string | undefined): Promise<Member | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!token || !projectId) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
    });
    const email = typeof payload.email === "string" ? payload.email : "";
    const provider = (payload.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider;
    if (payload.email_verified !== true || !isPunxEmail(email) || provider !== "google.com") return null;
    return { email, uid: String(payload.sub) };
  } catch {
    return null;
  }
}

export function tokenFromRequest(req: Request): string | undefined {
  const bearer = req.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) return bearer.slice(7);
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.split(/;\s*/).find((c) => c.startsWith(`${TOKEN_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(TOKEN_COOKIE.length + 1)) : undefined;
}

/** For route handlers: a 401 Response when the caller isn't a signed-in @punx.ai member, otherwise null. */
export async function requireMember(req: Request): Promise<Response | null> {
  if (PREVIEW_MODE) return null;
  const member = await verifyPunxToken(tokenFromRequest(req));
  if (member) return null;
  return Response.json({ error: "Sign in with your @punx.ai account to use this." }, { status: 401 });
}
