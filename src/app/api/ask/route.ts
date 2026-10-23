import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { searchRepos } from "@/lib/github";
import { requireMember } from "@/lib/server-auth";
import type { Repo } from "@/lib/types";

const MODEL = "claude-sonnet-5-5";

function text(res: Anthropic.Message) {
  return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

export async function POST(req: Request) {
  // Checked here as well as in the proxy: this route spends Anthropic credits.
  const denied = await requireMember(req);
  if (denied) return denied;

  const { question } = (await req.json().catch(() => ({}))) as { question?: string };
  const raw = question?.trim().slice(0, 500);
  if (!raw) return NextResponse.json({ error: "Ask a question first." }, { status: 400 });

  // Ask can't open links or files. Drop them from the question, and if nothing else is left, say so
  // without spending a model call.
  const hasLink = /https?:\/\/\S+/i.test(raw);
  const q = hasLink ? raw.replace(/https?:\/\/\S+/gi, " ").replace(/\s+/g, " ").trim() : raw;
  if (hasLink && q.length < 8) {
    return NextResponse.json({
      answer:
        "I can’t open links or files, so I can’t see what’s behind that one. Describe what you’re looking for in words, or to save a whole list of repos at once, use Library → Import repos.",
      repos: [],
    });
  }

  try {
    // Without an API key, degrade to a plain keyword search.
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ answer: null, repos: await searchRepos(q, 10) });
    }

    const client = new Anthropic();

    // Step 1: turn the question into GitHub search queries.
    const plan = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Turn this request into 1-3 GitHub repository search queries (GitHub search syntax, e.g. "markdown editor language:typescript stars:>100"). Reply with only a JSON array of strings.\n\nRequest: ${q}`,
        },
      ],
    });
    let queries: string[] = [];
    try {
      const m = text(plan).match(/\[[\s\S]*\]/);
      queries = m ? JSON.parse(m[0]) : [];
    } catch {
      queries = [];
    }
    if (!queries.length) queries = [q];

    // Step 2: run them and dedupe.
    const batches = await Promise.all(queries.slice(0, 3).map((s) => searchRepos(String(s), 8).catch(() => [] as Repo[])));
    const seen = new Set<string>();
    const repos = batches
      .flat()
      .filter((r) => !seen.has(r.fullName) && seen.add(r.fullName))
      .slice(0, 10);

    // Step 3: answer from the real results only.
    const listing = repos
      .map((r) => `- ${r.fullName} (★${r.stars}, ${r.language ?? "n/a"}): ${r.description ?? "no description"}`)
      .join("\n");
    const answer = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `A user asked: "${q}"\n\nGitHub search results:\n${listing || "(none)"}\n\nIn 2-4 sentences, say whether a repo matching the request exists and which results fit best, naming them as owner/name. If nothing fits, say so plainly. Use only the results above; do not invent repos.`,
        },
      ],
    });

    return NextResponse.json({ answer: text(answer), repos });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
