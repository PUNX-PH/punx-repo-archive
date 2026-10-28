import { ALLOWED_DOMAIN, isPunxEmail } from "./domain";

// Drive-style sharing for files and folders.
//   Restricted: only the owner and the people added by email.
//   Domain: anyone signed in with a punx.ai account (they get View access).
//   Public: HTML pages only. Anyone with the /p/<id> link can open the page without signing in.
// A file inside a folder is also reachable by whoever the folder is shared with.

export type Role = "viewer" | "editor";
export type Access = "restricted" | "domain" | "public";
export type Person = { email: string; role: Role };

/** What someone set up on one item: general access plus the people added by email. */
export type Sharing = { access: Access; people: Person[] };

/**
 * Everyone who can reach an item, worked out from its own sharing and its folder's.
 * Stored on the document so Firestore rules and queries can use it directly.
 */
export type Grants = { domain: boolean; viewers: string[]; editors: string[] };

export const MAX_PEOPLE = 50;
export const PRIVATE: Sharing = { access: "restricted", people: [] };

export const normEmail = (e: string) => e.trim().toLowerCase();

/** Returns an error message, or null when the address can be added. */
export function validatePerson(raw: string, existing: Person[], ownerEmail: string): string | null {
  const email = normEmail(raw);
  if (!email) return "Type an email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "That doesn’t look like an email address.";
  if (!isPunxEmail(email)) return `Only @${ALLOWED_DOMAIN} addresses can be added.`;
  if (email === normEmail(ownerEmail)) return "That’s the owner; they already have full access.";
  if (existing.some((p) => normEmail(p.email) === email)) return "They’re already on the list.";
  if (existing.length >= MAX_PEOPLE) return `You can add up to ${MAX_PEOPLE} people. Use “Anyone at ${ALLOWED_DOMAIN}” for more.`;
  return null;
}

const uniq = (list: string[]) => [...new Set(list.map(normEmail).filter(Boolean))];

/**
 * @param own the item's own sharing
 * @param folder the folder it sits in, if any, with that folder's owner (who always keeps full access)
 */
export function grantsFor(own: Sharing, folder?: { sharing: Sharing; ownerEmail: string } | null): Grants {
  const people = [...own.people, ...(folder?.sharing.people ?? [])];
  const folderOwner = folder?.ownerEmail ? [folder.ownerEmail] : [];
  const editors = uniq([...people.filter((p) => p.role === "editor").map((p) => p.email), ...folderOwner]);
  const viewers = uniq([...people.map((p) => p.email), ...editors]);
  return {
    // A public page is also open to everyone at punx.ai.
    domain: own.access !== "restricted" || (folder ? folder.sharing.access !== "restricted" : false),
    viewers,
    editors,
  };
}

export type Who = { uid: string; email: string };

/** How the signed-in person relates to an item. */
export type MyRole = "owner" | "editor" | "viewer";

export function roleOn(item: { ownerUid: string; editors?: string[] }, me: Who | null): MyRole {
  if (me && item.ownerUid === me.uid) return "owner";
  if (me && (item.editors ?? []).includes(normEmail(me.email))) return "editor";
  return "viewer";
}

/** One short line for a card: who else can see it. */
export function accessSummary(s: Sharing): { label: string; icon: "lock" | "people" | "domain" | "public" } {
  if (s.access === "public") return { label: "Public link, no sign-in", icon: "public" };
  if (s.access === "domain") return { label: `Anyone at ${ALLOWED_DOMAIN}`, icon: "domain" };
  if (s.people.length === 0) return { label: "Only you", icon: "lock" };
  return { label: `Shared with ${s.people.length}`, icon: "people" };
}
