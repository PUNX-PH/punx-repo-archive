import { NOT_AVAILABLE_HTML, PAGE_HEADERS, REDIRECT_HEADERS, isFileId, servablePage } from "@/lib/public-html";

// The no-sign-in link for a public item: /p/<id>. Open to anyone, but only serves an HTML page or a saved link
// its owner made public. A saved link sends the visitor on to its address.
// It asks Firestore and Storage as an anonymous visitor, so their rules (not this code) decide what is public.
export const dynamic = "force-dynamic";

const notAvailable = () =>
  new Response(NOT_AVAILABLE_HTML, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!isFileId(id) || !project || !apiKey || !bucket) return notAvailable();

  try {
    const meta = await fetch(
      `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/files/${id}?key=${apiKey}`,
      { cache: "no-store" },
    );
    if (!meta.ok) return notAvailable();
    const page = servablePage(await meta.json());
    if (!page) return notAvailable();

    if (page.type === "redirect") {
      return new Response(null, { status: 302, headers: { Location: page.url, ...REDIRECT_HEADERS } });
    }

    const object = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(page.path)}?alt=media`,
      { cache: "no-store" },
    );
    if (!object.ok || !object.body) return notAvailable();

    return new Response(object.body, { status: 200, headers: PAGE_HEADERS });
  } catch {
    return notAvailable();
  }
}
