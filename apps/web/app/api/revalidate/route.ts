import { timingSafeEqual } from "node:crypto";
import { cacheTagsOf } from "@repo/db/server";
import { revalidateTag } from "next/cache";

/**
 * POST /api/revalidate with `{ "tags": [...] }` and the shared secret as a
 * bearer token. The admin is a separate deployment, so it cannot refresh
 * this site's cache itself: after a change it names the tags here. Each tag
 * expires at once, so the next visitor reads what was just saved. See
 * docs/261001-locations-and-pages.md, "Keeping the pages fresh".
 */

function isAuthorised(request: Request, secret: string) {
  const sent = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return sent.length === expected.length && timingSafeEqual(sent, expected);
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return Response.json(
      { error: "REVALIDATE_SECRET is not set." },
      { status: 503 },
    );
  }
  if (!isAuthorised(request, secret)) {
    return Response.json({ error: "Not authorised." }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const tags = cacheTagsOf((body as { tags?: unknown } | null)?.tags);
  if (!tags) {
    return Response.json({ error: "Send a list of tags." }, { status: 400 });
  }
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: tags });
}
