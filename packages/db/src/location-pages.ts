import { getActivityEntry, logActivity, type ActivityEntry } from "./activity";
import type { ActivityEntityType, Actor } from "./activity-actions";
import { refuse, type Change, type Refusal } from "./change";
import { db } from "./client";
import type {
  Location,
  LocationAddress,
  LocationPage,
  Prisma,
} from "./generated/prisma/client";
import {
  LOCATION_STATES,
  TOP_CHOICE_CAP,
  checkLocationSlug,
  checkPageUnpublish,
  isPublicState,
  locationStateOf,
  type PageStanding,
} from "./location-input";
import {
  LANDING_PAGE,
  LANDING_REF,
  childrenOf,
  checkEntrySlug,
  isChildPage,
  isEntrySlugLocked,
  isLocationPageRef,
  isPlaceSection,
  loggedPageRef,
  pageKindOf,
  type LocationPageKey,
  type LocationPageRef,
  type LocationSection,
} from "./location-page-input";
import {
  offeredClassesOf,
  pageOfView,
  pageSlotsOf,
  previewLocationViewOf,
  publicLocationViewOf,
  topChoiceCardOf,
  type LocationRows,
  type LocationView,
  type LocationViewClass,
  type TopChoiceCard,
} from "./location-view";
import { deletedMediaRefusal } from "./media";
import { isUniqueViolation } from "./prisma-errors";
import {
  PAGE_KIND_RULES,
  PAGE_LIMITS,
  PAGE_LOCALE,
  checkPageComplete,
  checkPageLimits,
  emptyPageContent,
  heroLabelsOf,
  pageContentOf,
  pageImageUrls,
  pageStatusOf,
  publicCopyOf,
  type PageContent,
  type PageImage,
  type PageKind,
} from "./page-content";
import {
  PAGE_CHANGED,
  pageWriteData,
  publishChanges,
  versionOf,
  type PageSaved,
} from "./page-writes";

/**
 * The pages of a location: their readers for the console and, as views
 * (./location-view), for the customer site; and their writers, each
 * checking what ./location-page-input and ./page-content say and, but for a
 * draft save, logging in its transaction against the location. A page row
 * is keyed by its section and slug: the main page and a section's own page
 * have an empty slug. The pages under car with driver and coach charter
 * follow the classes the location offers; the pages under popular places,
 * attractions, hotels and the blog are added by Marketing. See
 * docs/261001-locations-and-pages.md and docs/261025-marketing-pages.md.
 */

const LOCATION: ActivityEntityType = "location";

const NOT_FOUND = refuse(
  "This location was deleted meanwhile. Go back to Locations.",
);

const PAGE_GONE = refuse("This page was deleted meanwhile. Go back to Pages.");

const pagesInLocale = { where: { locale: PAGE_LOCALE } };

/** What the page rows of a location need of its offerings: the classes they follow. */
export const offeringsForPages = {
  select: {
    isActive: true,
    vehicleClass: {
      select: {
        slug: true,
        name: true,
        category: true,
        isActive: true,
        sortOrder: true,
      },
    },
  },
} satisfies Prisma.LocationVehicleClassFindManyArgs;

/** The columns of a page's row that its standing is read from. */
export type PageRow = Pick<
  LocationPage,
  | "page"
  | "slug"
  | "isOn"
  | "draft"
  | "published"
  | "position"
  | "publishedAt"
  | "firstPublishedAt"
  | "updatedAt"
>;

/** A page as the screens list it: where it stands, its name and the picture it leads with. */
export type PageSummary = PageStanding & {
  kind: PageKind;
  /** The draft's hero image, else that of the copy last published; null when neither has one. */
  heroImage: PageImage | null;
  /**
   * A class's page whose class is not on sale at the location, or no
   * longer offered there: its public copy waits until it is again.
   */
  paused: boolean;
  /** Its place among the pages Marketing added to its section. */
  position: number;
  firstPublishedAt: Date | null;
  /** When its draft or its public copy last changed; null for a page never written. */
  updatedAt: Date | null;
  /** On a place, the saved address its draft points at; null for none. */
  addressId: string | null;
  /** Whether its draft lets search engines list it. */
  indexable: boolean;
};

/**
 * Every page of a location, written or not, in their order: the main
 * page, then each section's own page followed by the pages under it.
 */
export function standingsOf(
  rows: readonly PageRow[],
  offerings: LocationRows["offerings"],
): PageSummary[] {
  const classes = offeredClassesOf(offerings);
  return pageSlotsOf(rows, classes).map(({ ref, row }) => {
    const kind = pageKindOf(ref);
    const draft = row ? pageContentOf(kind, row.draft) : emptyPageContent(kind);
    const publicCopy = row ? publicCopyOf(kind, row) : null;
    const offered =
      kind === "class"
        ? classes.find((entry) => entry.slug === ref.slug)
        : undefined;
    return {
      ...ref,
      kind,
      name: offered?.name || draft.heroHeadline || ref.slug,
      status: pageStatusOf(draft, publicCopy),
      heroImage:
        draft.heroImage ??
        (row?.published == null
          ? null
          : pageContentOf(kind, row.published).heroImage),
      paused: kind === "class" && !offered?.onSale,
      position: row?.position ?? 0,
      firstPublishedAt: row?.firstPublishedAt ?? null,
      updatedAt: row?.updatedAt ?? null,
      addressId: draft.addressId,
      indexable: draft.indexable,
    };
  });
}

/** A location's pages as the console's list across locations shows them, under the location. */
export type LocationPageList = {
  id: string;
  slug: string;
  name: string;
  state: string;
  pages: PageSummary[];
};

/**
 * Every location's pages, or one location's, for the console's Pages
 * across locations: each location by name with its pages as its own Pages
 * tab lists them, the main page, each section's own and the pages under it.
 */
export async function listLocationPages(
  locationId?: string,
): Promise<LocationPageList[]> {
  const locations = await db.location.findMany({
    where: locationId ? { id: locationId } : {},
    orderBy: { name: "asc" },
    include: pagesForStandings,
  });
  return locations.map((location) => ({
    id: location.id,
    slug: location.slug,
    name: location.name,
    state: location.state,
    pages: standingsOf(location.pages, location.offerings),
  }));
}

/** What reads a location's pages for its standing, in a location's `include`. */
export const pagesForStandings = {
  pages: pagesInLocale,
  offerings: offeringsForPages,
} satisfies Prisma.LocationInclude;

const forSite = {
  include: {
    addresses: { orderBy: { position: "asc" } },
    pages: pagesInLocale,
    offerings: offeringsForPages,
  },
} satisfies Prisma.LocationDefaultArgs;

/**
 * The location at the slug as the public sees it: null for a slug no
 * location has, and for a location that is not public. A slug no location
 * could have is refused without asking the database, since this reads
 * whatever follows the customer site's first slash.
 */
export async function getPublicLocation(
  slug: string,
): Promise<LocationView | null> {
  if (!checkLocationSlug(slug).ok) return null;
  const location = await db.location.findUnique({
    where: { slug },
    ...forSite,
  });
  return location ? publicLocationViewOf(location) : null;
}

/** The location at the slug as staff preview it: the drafts, in any state. */
export async function getLocationPreview(
  slug: string,
): Promise<LocationView | null> {
  if (!checkLocationSlug(slug).ok) return null;
  const location = await db.location.findUnique({
    where: { slug },
    ...forSite,
  });
  return location ? previewLocationViewOf(location) : null;
}

/**
 * The text of a post or a document at the location, which a view leaves
 * out: the public copy, or with `preview` the draft. Empty for a page that
 * has none; the caller has found the page in its view first.
 */
export async function getLocationPageBody(
  slug: string,
  ref: LocationPageRef,
  preview: boolean,
): Promise<string> {
  const row = await db.locationPage.findFirst({
    where: {
      location: { slug },
      page: ref.page,
      slug: ref.slug,
      locale: PAGE_LOCALE,
    },
    select: { isOn: true, draft: true, published: true },
  });
  if (!row) return "";
  const kind = pageKindOf(ref);
  const content = preview
    ? pageContentOf(kind, row.draft)
    : publicCopyOf(kind, row);
  return content?.body ?? "";
}

/**
 * The home page's cards, in their order: the top choices that are live. A
 * paused one is left off and keeps its place.
 */
export async function listTopChoiceCards(): Promise<TopChoiceCard[]> {
  const locations = await db.location.findMany({
    where: { topChoiceOrder: { not: null }, state: "live" },
    orderBy: [{ topChoiceOrder: "asc" }, { name: "asc" }],
    take: TOP_CHOICE_CAP,
    include: {
      addresses: { orderBy: { position: "asc" } },
      // The main page alone: a card shows its hero and its tagline.
      pages: { where: { locale: PAGE_LOCALE, page: LANDING_PAGE, slug: "" } },
    },
  });
  return locations.flatMap((location) => {
    const view = publicLocationViewOf({ ...location, offerings: [] });
    return view ? [topChoiceCardOf(view)] : [];
  });
}

/** A location on a service's hub: its card, opening its own page of the service. */
export type ServiceLocationCard = {
  slug: string;
  name: string;
  /** The service page's subheadline, else the location's tagline; "" for neither. */
  text: string;
  /** The service page's hero image, else the main page's. */
  image: PageImage | null;
};

/**
 * The locations that serve a service, for its hub: those the public sees
 * whose own page of the service is published, the top choices first in
 * their order, then the others by name.
 */
export async function listServiceLocationCards(
  section: LocationSection,
): Promise<ServiceLocationCard[]> {
  const locations = await db.location.findMany({
    where: { state: { in: LOCATION_STATES.filter(isPublicState) } },
    orderBy: [
      { topChoiceOrder: { sort: "asc", nulls: "last" } },
      { name: "asc" },
    ],
    include: {
      addresses: { orderBy: { position: "asc" } },
      // The main page and the service's own: a card shows their words and image.
      pages: {
        where: {
          locale: PAGE_LOCALE,
          page: { in: [LANDING_PAGE, section] },
          slug: "",
        },
      },
    },
  });
  return locations.flatMap((location) => {
    const view = publicLocationViewOf({ ...location, offerings: [] });
    const page = view && pageOfView(view, { page: section, slug: "" });
    if (!view || !page) return [];
    return [
      {
        slug: view.slug,
        name: view.name,
        text: page.content.heroSubheadline || view.tagline || "",
        image:
          page.content.heroImage ??
          pageOfView(view, LANDING_REF)?.content.heroImage ??
          null,
      },
    ];
  });
}

/**
 * The locations the public sees, by slug: live or paused, with their main
 * page published. The footer leaves out a link to any other.
 */
export async function listPublicLocationSlugs(): Promise<string[]> {
  const locations = await db.location.findMany({
    where: { state: { in: LOCATION_STATES.filter(isPublicState) } },
    select: {
      slug: true,
      pages: {
        where: { locale: PAGE_LOCALE, page: LANDING_PAGE, slug: "" },
        select: { isOn: true, published: true },
      },
    },
  });
  return locations
    .filter(({ pages }) =>
      pages.some((page) => publicCopyOf("landing", page) !== null),
    )
    .map((location) => location.slug);
}

/** One page of a location, as its editor opens it. */
export type LocationPageDetails = {
  location: Location & {
    addresses: LocationAddress[];
    /** Its states, where a saved address added from the page may lie. */
    states: { code: string; name: string }[];
  };
  ref: LocationPageRef;
  kind: PageKind;
  /** What the lists call it: the class's name, or the headline. */
  name: string;
  draft: PageContent;
  /** The copy the public is shown; null while the page is not published. */
  published: PageContent | null;
  /** When that copy was published; null while the page is not published. */
  publishedAt: Date | null;
  /** Set at the first publish; a page added on demand keeps its slug from then. */
  firstPublishedAt: Date | null;
  /** Names the stored content, for `saveLocationPageDraft`. Null until first saved. */
  version: string | null;
  /** On a class's page, the class; null when the location no longer offers it. */
  vehicleClass: LocationViewClass | null;
  /** On a page under a section, whether the section's own page is published: the page is public only then. */
  sectionPublished: boolean;
};

const pageKey = (locationId: string, ref: LocationPageRef) => ({
  locationId_page_slug_locale: {
    locationId,
    page: ref.page,
    slug: ref.slug,
    locale: PAGE_LOCALE,
  },
});

/**
 * The page in its editor; null when the location is gone, or the page
 * cannot be there: a class the location does not offer and that has no
 * page, or a page added on demand that was deleted.
 */
export async function getLocationPage(
  locationId: string,
  ref: LocationPageRef,
): Promise<LocationPageDetails | null> {
  if (!isLocationPageRef(ref)) return null;
  const [location, row, section] = await Promise.all([
    db.location.findUnique({
      where: { id: locationId },
      include: {
        addresses: { orderBy: { position: "asc" } },
        offerings: offeringsForPages,
        states: {
          orderBy: { name: "asc" },
          select: { code: true, name: true },
        },
      },
    }),
    db.locationPage.findUnique({ where: pageKey(locationId, ref) }),
    isChildPage(ref)
      ? db.locationPage.findUnique({
          where: pageKey(locationId, { page: ref.page, slug: "" }),
          select: { isOn: true },
        })
      : null,
  ]);
  if (!location) return null;
  const { offerings, ...rest } = location;
  const kind = pageKindOf(ref);
  const children = childrenOf(ref.page);
  const vehicleClass =
    kind === "class"
      ? (offeredClassesOf(offerings).find((entry) => entry.slug === ref.slug) ??
        null)
      : null;
  if (isChildPage(ref) && !row) {
    // A class's page is written the first time it is saved; a page added
    // on demand has its row from "Add".
    if (children?.type !== "classes" || !vehicleClass) return null;
  }
  const draft = row ? pageContentOf(kind, row.draft) : emptyPageContent(kind);
  return {
    location: rest,
    ref,
    kind,
    name: vehicleClass?.name || draft.heroHeadline || ref.slug,
    draft,
    published: row ? publicCopyOf(kind, row) : null,
    publishedAt: row?.isOn ? row.publishedAt : null,
    firstPublishedAt: row?.firstPublishedAt ?? null,
    version: versionOf(row),
    vehicleClass,
    sectionPublished: section?.isOn === true,
  };
}

/** One publish from the location's history: the page and its content before and after. */
export type PagePublish = {
  entry: ActivityEntry;
  ref: LocationPageRef;
  kind: PageKind;
  /** The page's name as the entry recorded it. */
  name: string;
  /** Null on the page's first publish. */
  before: PageContent | null;
  after: PageContent;
};

/** The publish a history entry of the location records, or null when the entry is not one. */
export async function getPagePublish(
  locationId: string,
  entryId: string,
): Promise<PagePublish | null> {
  const entry = await getActivityEntry(entryId);
  if (
    !entry ||
    entry.entityType !== LOCATION ||
    entry.entityId !== locationId ||
    entry.action !== "location.page.published"
  ) {
    return null;
  }
  const after = entry.after as { content?: unknown; name?: unknown } | null;
  const before = entry.before as { content?: unknown } | null;
  const ref = loggedPageRef(entry.after);
  if (!ref) return null;
  const kind = pageKindOf(ref);
  const content = pageContentOf(kind, after?.content);
  return {
    entry,
    ref,
    kind,
    name:
      typeof after?.name === "string" && after.name !== ""
        ? after.name
        : content.heroHeadline || ref.slug,
    before: before?.content ? pageContentOf(kind, before.content) : null,
    after: content,
  };
}

/** What a write on a page reads first: the location, the page's row, and on a class's page the class. */
async function pageContext(
  tx: Prisma.TransactionClient,
  locationId: string,
  ref: LocationPageRef,
): Promise<
  | Refusal
  | {
      ok: true;
      addressIds: Set<string>;
      was: LocationPage | null;
      vehicleClass: LocationViewClass | null;
    }
> {
  if (!isLocationPageRef(ref)) return refuse("Missing page.");
  const location = await tx.location.findUnique({
    where: { id: locationId },
    include: {
      addresses: { select: { id: true } },
      offerings: offeringsForPages,
    },
  });
  if (!location) return NOT_FOUND;
  const was = await tx.locationPage.findUnique({
    where: pageKey(locationId, ref),
  });
  const kind = pageKindOf(ref);
  const vehicleClass =
    kind === "class"
      ? (offeredClassesOf(location.offerings).find(
          (entry) => entry.slug === ref.slug,
        ) ?? null)
      : null;
  if (isChildPage(ref) && !was && !vehicleClass) return PAGE_GONE;
  return {
    ok: true,
    addressIds: new Set(location.addresses.map((address) => address.id)),
    was,
    vehicleClass,
  };
}

/**
 * Writes the page's content inside the caller's transaction, when the
 * stored content is still the version the form was opened with. A saved
 * address the location does not hold is dropped, and a place is not
 * listed again under its own section. `publish` also makes the
 * content the page's public copy; a class's page is published only while
 * its class is on sale at the location. Answers the content as written and
 * the row as it was, for the caller's log.
 */
async function writePageContent(
  tx: Prisma.TransactionClient,
  locationId: string,
  ref: LocationPageRef,
  version: string | null,
  content: PageContent,
  publish: boolean,
): Promise<
  | Refusal
  | {
      ok: true;
      version: string;
      content: PageContent;
      was: LocationPage | null;
      name: string;
    }
> {
  const context = await pageContext(tx, locationId, ref);
  if (!context.ok) return context;
  const { was, vehicleClass } = context;
  if (versionOf(was) !== version) return PAGE_CHANGED;
  if (publish && pageKindOf(ref) === "class" && !vehicleClass?.onSale) {
    const name = vehicleClass?.name ?? ref.slug;
    return refuse(
      vehicleClass
        ? `Put ${name} on sale here first, on the Vehicle classes tab: its page shows only while it is.`
        : `${name} is no longer offered here. Offer it again on the Vehicle classes tab first.`,
    );
  }
  // An image uploaded in this form and deleted on Media before it saved.
  const gone = await deletedMediaRefusal(
    tx,
    pageImageUrls(content),
    "An image",
  );
  if (gone) return gone;

  const clean: PageContent = {
    ...content,
    addressId:
      content.addressId !== null && context.addressIds.has(content.addressId)
        ? content.addressId
        : null,
  };
  const now = new Date();
  const data = pageWriteData(clean, publish, was, now);
  // Conditional on the version read above, so two saves at once cannot both land.
  const { count } = was
    ? await tx.locationPage.updateMany({
        where: { id: was.id, updatedAt: was.updatedAt },
        data,
      })
    : await tx.locationPage.createMany({
        data: [
          {
            locationId,
            page: ref.page,
            slug: ref.slug,
            locale: PAGE_LOCALE,
            ...data,
          },
        ],
        skipDuplicates: true,
      });
  if (count !== 1) return PAGE_CHANGED;
  return {
    ok: true,
    version: now.toISOString(),
    content: clean,
    was,
    name: vehicleClass?.name || clean.heroHeadline || ref.slug,
  };
}

/**
 * Overwrites the page's working draft. Nothing changes in public, and
 * nothing is logged. Only the length limits are checked: a draft may be
 * incomplete.
 */
export async function saveLocationPageDraft(
  locationId: string,
  ref: LocationPageRef,
  version: string | null,
  draft: PageContent,
): Promise<PageSaved> {
  const content = pageContentOf(pageKindOf(ref), draft);
  const check = checkPageLimits(content);
  if (!check.ok) return check;

  return db.$transaction(async (tx) => {
    const written = await writePageContent(
      tx,
      locationId,
      ref,
      version,
      content,
      false,
    );
    return written.ok ? { ok: true, version: written.version } : written;
  });
}

/**
 * Saves the content as the page's draft and makes it the page's public
 * copy, when it is complete. A published page is one the public can see
 * once what it sits in is public: the location live, and for a page under a
 * section, the section's own page published. It works in any location
 * state. Publishing what is already public logs nothing.
 */
export async function publishLocationPage(
  actor: Actor,
  locationId: string,
  ref: LocationPageRef,
  version: string | null,
  draft: PageContent,
): Promise<PageSaved> {
  const kind = pageKindOf(ref);
  const content = pageContentOf(kind, draft);
  const check = checkPageComplete(kind, content);
  if (!check.ok) return check;

  return db.$transaction(async (tx) => {
    const written = await writePageContent(
      tx,
      locationId,
      ref,
      version,
      content,
      true,
    );
    if (!written.ok) return written;

    // The copy last published, which the diff in the history reads; a page
    // that was unpublished since is published again, and that is logged too.
    const before =
      written.was?.published == null
        ? null
        : pageContentOf(kind, written.was.published);
    if (publishChanges(written.was, before, written.content)) {
      await logActivity(tx, actor, {
        action: "location.page.published",
        entityId: locationId,
        before: { ...ref, content: before },
        after: { ...ref, name: written.name, content: written.content },
      });
    }
    return { ok: true, version: written.version };
  });
}

/**
 * Unpublishes a page: the public no longer sees it, and its draft and the
 * copy last published are kept. Unpublishing a page that is not published
 * logs nothing. The content's version is left as it is, so a form open on
 * the page still saves.
 */
export async function unpublishLocationPage(
  actor: Actor,
  locationId: string,
  ref: LocationPageRef,
): Promise<Change> {
  if (!isLocationPageRef(ref)) return refuse("Missing page.");
  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id: locationId },
    });
    if (!location) return NOT_FOUND;
    const row = await tx.locationPage.findUnique({
      where: pageKey(locationId, ref),
    });
    if (!row?.isOn) return { ok: true };

    const check = checkPageUnpublish(locationStateOf(location.state), ref);
    if (!check.ok) return check;

    // Only while the content is the one read above: writing its version
    // back over a save that landed meanwhile would hide that save.
    const { count } = await tx.locationPage.updateMany({
      where: { id: row.id, updatedAt: row.updatedAt },
      data: { isOn: false, updatedAt: row.updatedAt },
    });
    if (count !== 1) {
      return { ok: false, error: "The page was just saved. Try again." };
    }
    await logActivity(tx, actor, {
      action: "location.page.updated",
      entityId: locationId,
      before: { ...ref, isOn: true },
      after: {
        ...ref,
        name: pageContentOf(pageKindOf(ref), row.draft).heroHeadline,
        isOn: false,
      },
    });
    return { ok: true };
  });
}

/** The section's pages Marketing added, in their order. */
function entriesOf(
  tx: Prisma.TransactionClient,
  locationId: string,
  page: LocationPageKey,
) {
  return tx.locationPage.findMany({
    where: { locationId, page, locale: PAGE_LOCALE, slug: { not: "" } },
    orderBy: [{ position: "asc" }, { slug: "asc" }],
  });
}

/** Why the section takes no page added on demand; null when it does. */
function entriesRefusal(page: LocationPageKey): Refusal | null {
  return childrenOf(page)?.type === "entries"
    ? null
    : refuse("Pages cannot be added there.");
}

/**
 * Why the page is not one added on demand, which alone is renamed, moved
 * or deleted as one: its section takes none, or it is the section's own
 * page, which no slug names. Null when it is.
 */
function addedPageRefusal(ref: LocationPageRef): Refusal | null {
  return (
    entriesRefusal(ref.page) ??
    (isChildPage(ref) ? null : refuse("That is the section's own page."))
  );
}

const SLUG_TAKEN = refuse(
  "Another page here already has this slug. Choose another.",
  "slug",
);

/** Why another page of the section cannot take the slug; null when none has it. */
async function entrySlugTaken(
  tx: Prisma.TransactionClient,
  locationId: string,
  page: LocationPageKey,
  slug: string,
): Promise<Refusal | null> {
  const taken = await tx.locationPage.findUnique({
    where: pageKey(locationId, { page, slug }),
    select: { id: true },
  });
  return taken ? SLUG_TAKEN : null;
}

/**
 * A write that gives a page under a section its slug, refused as taken
 * when another admin gave the same one at the same moment: the check
 * before the write cannot see a write not yet committed, the unique index
 * can.
 */
async function claimingSlug(write: () => Promise<Change>): Promise<Change> {
  try {
    return await write();
  } catch (error) {
    if (isUniqueViolation(error, "slug")) return SLUG_TAKEN;
    throw error;
  }
}

/**
 * A page added on demand: its title, which starts its headline, its slug,
 * and for a place the saved address it may start with.
 */
export type EntryFields = {
  title: string;
  slug: string;
  addressId?: string | null;
};

/** The title is filled and within the headline's limit; `label` is what its editor calls it. */
function checkEntryTitle(title: string, label: string): Change {
  const what = label.toLowerCase();
  if (title === "") return refuse(`Enter the ${what}.`, "title");
  if (title.length > PAGE_LIMITS.heroHeadline) {
    return refuse(
      `The ${what} is at most ${PAGE_LIMITS.heroHeadline} characters.`,
      "title",
    );
  }
  return { ok: true };
}

/** A title as a page starts with it, its spaces tidied. */
const entryTitleOf = (title: string) => title.replace(/\s+/g, " ").trim();

/** Why the section takes no page with these fields, read off them alone; null when it may. */
function entryFieldsRefusal(
  page: LocationPageKey,
  fields: EntryFields,
): Refusal | null {
  const refused = entriesRefusal(page);
  if (refused) return refused;
  // The slug first: with one, the page is under the section and its kind known.
  const slugCheck = checkEntrySlug(fields.slug);
  if (!slugCheck.ok) return slugCheck;
  const titleCheck = checkEntryTitle(
    entryTitleOf(fields.title),
    heroLabelsOf(pageKindOf({ page, slug: fields.slug })).headline,
  );
  return titleCheck.ok ? null : titleCheck;
}

/**
 * Why the page could not be added as it stands: its fields, or its slug
 * taken by another page of the section; null when it could. For a write
 * that adds the page after another, as a saved address with its page, so
 * a refused page writes nothing.
 */
export async function checkNewEntry(
  locationId: string,
  page: LocationPageKey,
  fields: EntryFields,
): Promise<Refusal | null> {
  return (
    entryFieldsRefusal(page, fields) ??
    (await entrySlugTaken(db, locationId, page, fields.slug))
  );
}

/**
 * Adds a page to a section that takes pages on demand: a popular place, an
 * attraction, a hotel or a post. It starts as a draft, its headline the
 * title, last in the section's order. A section takes any number.
 */
export async function createLocationEntry(
  actor: Actor,
  locationId: string,
  page: LocationPageKey,
  fields: EntryFields,
): Promise<Change> {
  const refused = entryFieldsRefusal(page, fields);
  if (refused) return refused;
  const name = entryTitleOf(fields.title);

  return claimingSlug(() =>
    db.$transaction(async (tx) => {
      const location = await tx.location.findUnique({
        where: { id: locationId },
        select: { id: true, addresses: { select: { id: true } } },
      });
      if (!location) return NOT_FOUND;
      const kind = pageKindOf({ page, slug: fields.slug });
      const addressId = PAGE_KIND_RULES[kind].address
        ? (fields.addressId ?? null)
        : null;
      if (
        addressId !== null &&
        !location.addresses.some((address) => address.id === addressId)
      ) {
        return refuse(
          "That saved address was removed meanwhile. Choose another.",
          "addressId",
        );
      }
      const current = await entriesOf(tx, locationId, page);
      const taken = await entrySlugTaken(tx, locationId, page, fields.slug);
      if (taken) return taken;

      await tx.locationPage.create({
        data: {
          locationId,
          page,
          slug: fields.slug,
          locale: PAGE_LOCALE,
          position: (current.at(-1)?.position ?? -1) + 1,
          draft: { heroHeadline: name, addressId },
        },
      });
      await logActivity(tx, actor, {
        action: "location.page.created",
        entityId: locationId,
        after: { page, slug: fields.slug, name },
      });
      return { ok: true };
    }),
  );
}

/**
 * Gives a page added on demand a new slug, and a place a new type (another
 * section of places), until it is first published: both are its address.
 * Its content and its version stay, so its editor saves on.
 */
export async function renameLocationEntry(
  actor: Actor,
  locationId: string,
  from: LocationPageRef,
  to: LocationPageRef,
): Promise<Change> {
  const refused = addedPageRefusal(from);
  if (refused) return refused;
  if (
    to.page !== from.page &&
    !(isPlaceSection(from.page) && isPlaceSection(to.page))
  ) {
    return refuse("Only a place can change its type.", "page");
  }
  const slugCheck = checkEntrySlug(to.slug);
  if (!slugCheck.ok) return slugCheck;
  if (from.page === to.page && from.slug === to.slug) return { ok: true };

  return claimingSlug(() =>
    db.$transaction(async (tx) => {
      const row = await tx.locationPage.findUnique({
        where: pageKey(locationId, from),
      });
      if (!row) return PAGE_GONE;
      if (isEntrySlugLocked(row)) {
        return refuse(
          "The address is locked: the page has been published. A new one needs a redirect from the old, which comes with the move to heavenlytravel.my.",
          "slug",
        );
      }
      const taken = await entrySlugTaken(tx, locationId, to.page, to.slug);
      if (taken) return taken;
      const kind = pageKindOf(to);
      const draft = pageContentOf(kind, row.draft);
      const moved = to.page !== from.page;
      await tx.locationPage.update({
        where: { id: row.id },
        data: {
          page: to.page,
          slug: to.slug,
          ...(moved
            ? {
                // Last in its new section's order.
                position:
                  ((await entriesOf(tx, locationId, to.page)).at(-1)
                    ?.position ?? -1) + 1,
              }
            : {}),
          updatedAt: row.updatedAt,
        },
      });
      await logActivity(tx, actor, {
        action: "location.page.renamed",
        entityId: locationId,
        before: { page: from.page, slug: from.slug },
        after: { page: to.page, slug: to.slug, name: draft.heroHeadline },
      });
      return { ok: true };
    }),
  );
}

/**
 * Deletes a page added on demand, its draft and its public copy. Its
 * address becomes a 404; its publishes stay in the location's history.
 */
export async function deleteLocationEntry(
  actor: Actor,
  locationId: string,
  page: LocationPageKey,
  slug: string,
): Promise<Change> {
  const refused = addedPageRefusal({ page, slug });
  if (refused) return refused;
  return db.$transaction(async (tx) => {
    const row = await tx.locationPage.findUnique({
      where: pageKey(locationId, { page, slug }),
    });
    if (!row) return { ok: true };
    await tx.locationPage.delete({ where: { id: row.id } });
    await logActivity(tx, actor, {
      action: "location.page.deleted",
      entityId: locationId,
      before: {
        page,
        slug,
        name: pageContentOf(pageKindOf({ page, slug }), row.draft).heroHeadline,
        isOn: row.isOn,
      },
    });
    return { ok: true };
  });
}

/**
 * Moves a page added on demand one place up or down in its section, one
 * shown in Marketing's order: the blog's posts are shown newest first. The
 * places are written again as 0, 1, 2 with no gaps, and the order logged.
 */
export async function moveLocationEntry(
  actor: Actor,
  locationId: string,
  page: LocationPageKey,
  slug: string,
  by: -1 | 1,
): Promise<Change> {
  const refused = addedPageRefusal({ page, slug });
  if (refused) return refused;
  const children = childrenOf(page);
  if (children?.type === "entries" && !children.ordered) {
    return refuse(
      `The ${children.many} here are shown newest first, not in an order.`,
    );
  }
  return db.$transaction(async (tx) => {
    const rows = await entriesOf(tx, locationId, page);
    const before = rows.map((row) => row.slug);
    const index = before.indexOf(slug);
    if (index < 0) return PAGE_GONE;
    const other = index + by;
    if (other < 0 || other >= rows.length) return { ok: true };
    const after = [...before];
    after.splice(index, 1);
    after.splice(other, 0, slug);
    for (const row of rows) {
      const position = after.indexOf(row.slug);
      if (row.position === position) continue;
      // The order is not the content: the version stays, so editors save on.
      await tx.locationPage.update({
        where: { id: row.id },
        data: { position, updatedAt: row.updatedAt },
      });
    }
    await logActivity(tx, actor, {
      action: "location.pages.ordered",
      entityId: locationId,
      before: { page, order: before },
      after: { page, order: after, moved: slug },
    });
    return { ok: true };
  });
}
