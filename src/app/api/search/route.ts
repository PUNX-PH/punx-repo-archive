import { NextResponse } from "next/server";
import { searchRepos } from "@/lib/github";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ repos: [] });
  try {
    return NextResponse.json({ repos: await searchRepos(q) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
