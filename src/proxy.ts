import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PREVIEW_MODE, TOKEN_COOKIE } from "./lib/domain";
import { verifyPunxToken } from "./lib/server-auth";

// Everything except the sign-in page needs a valid @punx.ai session.
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname === "/profile" || PREVIEW_MODE) return NextResponse.next();

  // Local development without Firebase keys: nothing to check against, so don't lock yourself out.
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const member = await verifyPunxToken(req.cookies.get(TOKEN_COOKIE)?.value);
  if (member) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in with your @punx.ai account to use this." }, { status: 401 });
  }

  const url = new URL("/profile", req.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  // Skip only Next's build assets, the favicon and the public brand logos (they must load on the
  // sign-in page). Don't exclude paths just because they contain a dot: repo pages like
  // /repo/vercel/next.js must stay locked. These patterns match whole paths from the root only.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico$|icon\\.svg$|brand/).*)"],
};
