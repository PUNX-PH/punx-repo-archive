import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders a repo README. Raw HTML is not rendered (react-markdown's default), and
// relative links/images are pointed back at GitHub so they don't 404 on our domain.
export function Readme({ source, owner, name }: { source: string; owner: string; name: string }) {
  const blob = `https://github.com/${owner}/${name}/blob/HEAD/`;
  const raw = `https://raw.githubusercontent.com/${owner}/${name}/HEAD/`;

  const resolve = (url: string, base: string) =>
    /^(https?:|mailto:|#)/i.test(url) ? url : base + url.replace(/^\.?\//, "");

  return (
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
  );
}
