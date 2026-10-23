"use client";

import { useState } from "react";
import { CheckIcon } from "./Icons";

// Copy-ready ways to get the code. Pick a method, tap Copy, paste into a terminal.
export function CloneBox({ owner, name }: { owner: string; name: string }) {
  const methods = [
    { id: "https", label: "HTTPS", cmd: `git clone https://github.com/${owner}/${name}.git` },
    { id: "ssh", label: "SSH", cmd: `git clone git@github.com:${owner}/${name}.git` },
    { id: "gh", label: "GitHub CLI", cmd: `gh repo clone ${owner}/${name}` },
  ];
  const [id, setId] = useState("https");
  const [copied, setCopied] = useState(false);
  const current = methods.find((m) => m.id === id) ?? methods[0];

  async function copy() {
    try {
      await navigator.clipboard.writeText(current.cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked: the command stays selectable.
    }
  }

  return (
    <section>
      <h2>Get the code</h2>
      <div className="clone">
        <div className="segmented" role="tablist" aria-label="Clone method">
          {methods.map((m) => (
            <button key={m.id} role="tab" aria-selected={id === m.id} className={id === m.id ? "is-active" : undefined} onClick={() => { setId(m.id); setCopied(false); }}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="clone-row">
          <code translate="no" tabIndex={0}>{current.cmd}</code>
          <button className="btn" onClick={copy} aria-label={`Copy ${current.label} command`}>
            {copied ? <><CheckIcon size={16} /> Copied</> : "Copy"}
          </button>
        </div>
      </div>
    </section>
  );
}
