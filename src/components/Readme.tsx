"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders a repo README, collapsed by default since many are very long. Raw HTML is not rendered
// (react-markdown's default), and relative links/images point back at GitHub so they don't 404 here.
export function Readme({ source, owner, name }: { source: string; owner: string; name: string }) {
  const [open, setOpen] = useState(false);
  const long = source.length > 1800;
  const blob = `https://github.com/${owner}/${name}/blob/HEAD/`;
  const raw = `https://raw.githubusercontent.com/${owner}/${name}/HEAD/`;

  const resolve = (url: string, base: string) =>
    /^(https?:|mailto:|#)/i.test(url) ? url : base + url.replace(/^\.?\//, "");

  return (
    <div className={`readme-wrap${long && !open ? " is-clamped" : ""}`}>
      <div className="readme">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href = "", children }) => (
              <a href={resolve(href, blob)} target="_blank" rel="noopener noreferrer">{children}</a>
            ),
            // eslint-disable-next-line @next/next/no-img-element
            img: ({ src, alt }) => <img src={resolve(typeof src === "string" ? src : "", raw)} alt={alt ?? ""} loading="lazy" />,
          }}
        >
          {source}
        </ReactMarkdown>
      </div>
      {long && (
        <button className="btn readme-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Show less" : "Show full README"}
        </button>
      )}
    </div>
  );
}
