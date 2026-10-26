// Usage: pnpm --filter @repo/db db:migrate-popular-places
//
// Run once per database after the schema push of
// docs/261025-marketing-pages.md. A location's main page held highlights
// until then; they are popular places now, each a page of its own under
// /[location]/popular-places. Each highlight of a main page's draft (or of
// its published copy, where the draft has none) becomes a popular place's
// draft: its name the headline and the slug, the start of its text the short
// description and the whole text the start of the intro, its image the
// hero, its saved address kept. They are drafts: none has the SEO fields or
// the intro a page needs, so Marketing completes and publishes them, and the
// Popular places page, before a main page shows them. The main page's own
// content is left as it is; its highlights are no longer read.
//
// A highlight whose slug a popular place of the location already has is
// skipped, so running it again changes nothing.
import { logActivity } from "../src/activity";
import { SYSTEM_ACTOR } from "../src/activity-actions";
import { db } from "../src/client";
import { LANDING_PAGE } from "../src/location-page-input";
import { PAGE_LIMITS, PAGE_LOCALE, pageContentOf } from "../src/page-content";
import { slugify } from "../src/slug";

const SECTION = "popular-places";

type Highlight = {
  name: string;
  text: string;
  image: unknown;
  addressId: string | null;
};

/** The highlights a stored main page holds, read loosely: the content no longer knows them. */
function highlightsOf(value: unknown): Highlight[] {
  const rows =
    typeof value === "object" && value !== null && "highlights" in value
      ? (value as { highlights: unknown }).highlights
      : null;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row: unknown) => {
    if (typeof row !== "object" || row === null) return [];
    const { name, text, image, addressId } = row as Record<string, unknown>;
    const clean =
      typeof name === "string" ? name.replace(/\s+/g, " ").trim() : "";
    if (clean === "") return [];
    return [
      {
        name: clean.slice(0, PAGE_LIMITS.heroHeadline),
        text: typeof text === "string" ? text.trim() : "",
        image,
        addressId:
          typeof addressId === "string" && addressId !== "" ? addressId : null,
      },
    ];
  });
}

/** The text up to the limit, cut at a word. */
function shortened(text: string, limit: number) {
  const line = text.replace(/\s+/g, " ").trim();
  if (line.length <= limit) return line;
  const cut = line.slice(0, limit - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : cut.length)}…`;
}

const mains = await db.locationPage.findMany({
  where: { page: LANDING_PAGE, slug: "", locale: PAGE_LOCALE },
  include: { location: { select: { id: true, name: true } } },
});

let created = 0;
for (const main of mains) {
  const fromDraft = highlightsOf(main.draft);
  const highlights =
    fromDraft.length > 0 ? fromDraft : highlightsOf(main.published);
  if (highlights.length === 0) continue;

  const existing = await db.locationPage.findMany({
    where: {
      locationId: main.locationId,
      page: SECTION,
      locale: PAGE_LOCALE,
      slug: { not: "" },
    },
    select: { slug: true, position: true },
  });
  const taken = new Set(existing.map((row) => row.slug));
  let position = Math.max(-1, ...existing.map((row) => row.position)) + 1;

  for (const highlight of highlights) {
    const slug = slugify(highlight.name);
    if (slug === "" || taken.has(slug)) {
      console.log(`${main.location.name}: skipped “${highlight.name}”.`);
      continue;
    }
    taken.add(slug);
    const draft = pageContentOf("place", {
      heroHeadline: highlight.name,
      heroSubheadline: shortened(highlight.text, PAGE_LIMITS.heroSubheadline),
      heroImage: highlight.image,
      intro: highlight.text,
      addressId: highlight.addressId,
    });
    await db.$transaction(async (tx) => {
      await tx.locationPage.create({
        data: {
          locationId: main.locationId,
          page: SECTION,
          slug,
          locale: PAGE_LOCALE,
          position: position++,
          draft,
        },
      });
      await logActivity(tx, SYSTEM_ACTOR, {
        action: "location.page.created",
        entityId: main.locationId,
        after: { page: SECTION, slug, name: highlight.name },
      });
    });
    created += 1;
    console.log(`${main.location.name}: /${SECTION}/${slug}, a draft.`);
  }
}

await db.$disconnect();
console.log(`${created} popular places made from highlights, as drafts.`);
