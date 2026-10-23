import { NextResponse } from "next/server";
import { searchRepos } from "@/lib/github";
import { requireMember } from "@/lib/server-auth";
import { isRange, trendingQuery } from "@/lib/trending";

export async function GET(req: Request) {
  const denied = await requireMember(req);
  if (denied) return denied;

  const range = new URL(req.url).searchParams.get("range");
  if (!isRange(range)) return NextResponse.json({ error: "Unknown range." }, { status: 400 });

  try {
    const repos = await searchRepos(trendingQuery(range), 8, "stars");
    return NextResponse.json({ repos }, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
