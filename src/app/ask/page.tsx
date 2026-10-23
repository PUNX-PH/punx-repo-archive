"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useBookmarks } from "@/components/BookmarksProvider";
import { CheckIcon, SparkIcon } from "@/components/Icons";
import { RepoCard } from "@/components/RepoCard";
import type { Repo } from "@/lib/types";

const EXAMPLES = [
  "Is there a repo that turns Figma designs into React code?",
  "Open-source alternative to Notion I can self-host",
  "A Rust CLI for finding duplicate files",
];

const ASKS_KEY = "punx.asks.v1";

function readAsks(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(ASKS_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function forgetAsk(q: string): string[] {
  const next = readAsks().filter((s) => s.toLowerCase() !== q.toLowerCase());
  try {
    if (next.length === 0) localStorage.removeItem(ASKS_KEY);
    else localStorage.setItem(ASKS_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

function rememberAsk(q: string) {
  try {
    const next = [q, ...readAsks().filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, 5);
    localStorage.setItem(ASKS_KEY, JSON.stringify(next));
  } catch {}
}

function Ask() {
  const params = useSearchParams();
  const { saveMany } = useBookmarks();
  const [question, setQuestion] = useState(params.get("q") ?? "");
  const [asked, setAsked] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [savedAll, setSavedAll] = useState(false);
  const autoRan = useRef(false);

  useEffect(() => setRecent(readAsks()), []);

  async function ask(q: string) {
    if (!q.trim() || busy) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    setRepos([]);
    setSavedAll(false);
    setAsked(q.trim());
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
      rememberAsk(q.trim());
      setRecent(readAsks());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Arriving from a "no results" page with ?q= runs the question right away.
  useEffect(() => {
    const q = params.get("q");
    if (q && !autoRan.current) {
      autoRan.current = true;
      ask(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyAnswer() {
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer.replace(/\*\*/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked.
    }
  }

  const fresh = !busy && !answer && !error && repos.length === 0;

  return (
    <>
      <p className="eyebrow">Ask Claude</p>
      <h1>Does a repo for this already exist?</h1>
      <p className="muted">Describe what you’re about to build in plain words. We search GitHub for you and tell you what fits.</p>

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
        <div className="ask-row">
          <span className="muted hint">{question.length}/500 · Ctrl+Enter to send</span>
          <button type="submit" disabled={busy || !question.trim()}>
            <SparkIcon size={18} /> {busy ? "Looking…" : "Ask"}
          </button>
        </div>
      </form>

      {(/https?:\/\//i.test(question) || question.length > 400) && (
        <p className="notice-inline" role="note">
          Ask can’t open links or files, and questions are limited to 500 characters. To save a list of repos, use{" "}
          <Link href="/library?import=1" style={{ textDecoration: "underline" }}>Library → Import repos</Link>.
        </p>
      )}

      {fresh && recent.length > 0 && (
        <section>
          <div className="section-head">
            <h2>Your recent questions</h2>
            <button
              className="link-btn"
              onClick={() => {
                try {
                  localStorage.removeItem(ASKS_KEY);
                } catch {}
                setRecent([]);
              }}
            >
              Clear all
            </button>
          </div>
          <div className="examples">
            {recent.map((r) => (
              <div key={r} className="example-wrap">
                <button className="example" onClick={() => { setQuestion(r); ask(r); }}>{r}</button>
                <button className="example-x" onClick={() => setRecent(forgetAsk(r))} aria-label={`Remove “${r}” from recent questions`}>×</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {fresh && (
        <section>
          <h2>Try one of these</h2>
          <div className="examples">
            {EXAMPLES.map((ex) => (
              <button key={ex} className="example" onClick={() => { setQuestion(ex); ask(ex); }}>{ex}</button>
            ))}
          </div>
        </section>
      )}

      {busy && (
        <div className="answer" role="status" aria-live="polite">
          <p className="answer-label"><SparkIcon size={14} /> Searching GitHub</p>
          <div className="skeleton" style={{ width: "92%", height: 14 }} />
          <div className="skeleton" style={{ width: "78%", height: 14, marginTop: 8 }} />
          <div className="skeleton" style={{ width: "40%", height: 14, marginTop: 8 }} />
        </div>
      )}

      {error && (
        <div className="notice error-box" role="alert">
          <strong>That didn’t work.</strong>
          <span>{error}</span>
          <button className="btn" onClick={() => ask(asked || question)}>Try again</button>
        </div>
      )}

      {answer && (
        <div className="answer answer-in" role="status">
          <div className="answer-top">
            <p className="answer-label"><SparkIcon size={14} /> Claude says</p>
            <button className="link-btn" onClick={copyAnswer}>{copied ? "Copied ✓" : "Copy"}</button>
          </div>
          <div className="answer-text">
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
        </div>
      )}

      {repos.length > 0 && (
        <>
          <div className="result-bar">
            <p className="muted result-count" style={{ margin: 0 }}>
              {repos.length} repos found ·{" "}
              <Link href={`/search?q=${encodeURIComponent(asked)}`}>Search “{asked.length > 30 ? asked.slice(0, 30) + "…" : asked}” instead</Link>
            </p>
            <button
              className="btn"
              disabled={savedAll}
              onClick={async () => {
                await saveMany(repos);
                setSavedAll(true);
              }}
            >
              {savedAll ? <><CheckIcon size={16} /> Saved all</> : `Save all ${repos.length}`}
            </button>
          </div>
          <div className="grid">
            {repos.map((r) => (
              <RepoCard key={r.fullName} repo={r} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={<h1>Ask</h1>}>
      <Ask />
    </Suspense>
  );
}
