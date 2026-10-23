// Pulls "owner/name" repo references out of pasted text or a CSV: GitHub links in any common form
// (https://github.com/o/n, .../tree/main, git@github.com:o/n.git, markdown links) and bare owner/name cells.

export const MAX_IMPORT = 300;

// github.com paths that look like owner/name but aren't repos.
const RESERVED = new Set([
  "orgs", "topics", "sponsors", "features", "settings", "marketplace", "about", "pricing", "login", "join",
  "explore", "notifications", "issues", "pulls", "search", "collections", "trending", "apps", "enterprise",
  "customer-stories", "readme", "security", "contact", "site", "new", "organizations", "users", "resources",
]);

// Slash pairs that show up in ordinary sentences.
const PROSE = new Set([
  "and/or", "w/o", "n/a", "he/she", "his/her", "yes/no", "on/off", "true/false", "input/output", "i/o",
  "read/write", "client/server", "either/or", "up/down", "s/he", "tcp/ip", "ci/cd", "b/c", "w/e",
]);

const SAFE = /^[A-Za-z0-9_.-]+$/;
const URL_RE = /github\.com[/:]([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/gi;
const BARE_RE = /^([A-Za-z0-9][A-Za-z0-9_-]*)\/([A-Za-z0-9_.-]+)$/;

/** Returns unique "owner/name" strings in the order they first appear. */
export function parseRepoList(text: string): string[] {
  const found = new Map<string, string>();

  const add = (owner: string, rawName: string) => {
    const name = rawName.replace(/\.git$/i, "").replace(/\.+$/, "");
    if (!owner || !name || owner.length > 39 || name.length > 100) return;
    if (!SAFE.test(owner) || !SAFE.test(name) || RESERVED.has(owner.toLowerCase())) return;
    const key = `${owner}/${name}`.toLowerCase();
    if (!found.has(key)) found.set(key, `${owner}/${name}`);
  };

  // Cells are split on whitespace, commas, semicolons and pipes, so CSV rows and one-per-line lists both work.
  for (const cell of text.split(/[\s,;|]+/)) {
    const c = cell.trim().replace(/^["'<(\[]+|["'>)\]]+$/g, "");
    if (!c) continue;
    let viaUrl = false;
    for (const m of c.matchAll(URL_RE)) {
      add(m[1], m[2]);
      viaUrl = true;
    }
    if (!viaUrl) {
      const bare = c.match(BARE_RE);
      // Plain prose like "and/or" or "1/2" isn't a repo: both halves need a letter, and common word pairs are skipped.
      if (bare && /[A-Za-z]/.test(bare[1]) && /[A-Za-z]/.test(bare[2]) && !PROSE.has(c.toLowerCase())) add(bare[1], bare[2]);
    }
  }
  return [...found.values()];
}
