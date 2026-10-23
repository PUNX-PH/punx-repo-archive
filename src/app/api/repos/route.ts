import { NextResponse } from "next/server";
import { getRepoBasic } from "@/lib/github";
import { requireMember } from "@/lib/server-auth";
import type { Repo } from "@/lib/types";

const MAX_PER_REQUEST = 50;
const NAME_RE = /^[A-Za-z0-9_.-]{1,39}\/[A-Za-z0-9_.-]{1,100}$/;

// Looks up a batch of "owner/name" repos for Library > Import repos.
// Returns what was found, what doesn't exist on GitHub, and what couldn't be checked (rate limit or outage).
export async function POST(req: Request) {
  const denied = await requireMember(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as { names?: unknown };
  const names = Array.isArray(body.names) ? body.names.filter((n): n is string => typeof n === "string" && NAME_RE.test(n)) : [];
  if (names.length === 0) return NextResponse.json({ error: "No valid repos to look up." }, { status: 400 });
  if (names.length > MAX_PER_REQUEST) {
    return NextResponse.json({ error: `Send at most ${MAX_PER_REQUEST} repos at a time.` }, { status: 400 });
  }

  const found: Repo[] = [];
  const missing: string[] = [];
  const failed: string[] = [];

  // A few lookups at a time keeps this quick without hammering GitHub.
  let next = 0;
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (next < names.length) {
        const name = names[next++];
        const [owner, repo] = name.split("/");
        try {
          const r = await getRepoBasic(owner, repo);
          if (r) found.push(r);
          else missing.push(name);
        } catch {
          failed.push(name);
        }
      }
    }),
  );

  // Keep the order the list was given in.
  const order = new Map(names.map((n, i) => [n.toLowerCase(), i]));
  found.sort((a, b) => (order.get(a.fullName.toLowerCase()) ?? 0) - (order.get(b.fullName.toLowerCase()) ?? 0));

  return NextResponse.json({ repos: found, missing, failed });
}
