"use client";

import { useState } from "react";
import { RepoCard } from "@/components/RepoCard";
import type { Repo } from "@/lib/types";

const EXAMPLES = [
  "Is there a repo that turns Figma designs into React code?",
  "Open-source alternative to Notion I can self-host",
  "A Rust CLI for finding duplicate files",
];

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    if (!q.trim() || busy) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    setRepos([]);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setAnswer(data.answer);
      setRepos(data.repos);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Ask</h1>
      <p className="muted">Describe what you need. We’ll check whether a repo like it already exists.</p>
      <form
        className="askbox"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Is there a repo that…"
          rows={3}
          maxLength={500}
          aria-label="Your question"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask(question);
          }}
        />
        <button type="submit" disabled={busy || !question.trim()}>{busy ? "Looking…" : "Ask"}</button>
      </form>

      {!answer && !busy && repos.length === 0 && (
        <div className="chips">
          {EXAMPLES.map((ex) => (
            <button key={ex} className="chip" onClick={() => { setQuestion(ex); ask(ex); }}>{ex}</button>
          ))}
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {answer && <div className="answer" role="status">{answer}</div>}
      <div className="stack">
        {repos.map((r) => (
          <RepoCard key={r.fullName} repo={r} />
        ))}
      </div>
    </>
  );
}
