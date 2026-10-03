import { TRIP_CATEGORIES } from "./booking-status";
import type { Change } from "./change";
import { guardFor } from "./const-enum";
import { textOf, type Parsed } from "./fields";
import {
  LANDING_PAGE,
  pageNameOf,
  type LocationPageKey,
  type PageStatus,
} from "./location-page-input";
import { slugify } from "./slug";

/**
 * What the Locations screens edit and the rules they check, pure and
 * browser-safe: the forms display the messages, the writers in ./locations
 * apply the same checks before they write. See
 * docs/261001-locations-and-pages.md.
 */

const fail = (error: string): Change => ({ ok: false, error });

/** What the public sees of a location. The state is the location's, not its district's. */
export const LOCATION_STATES = ["draft", "preview", "live", "paused"] as const;
export type LocationState = (typeof LOCATION_STATES)[number];
export const isLocationState = guardFor(LOCATION_STATES);
export const LOCATION_STATE_LABELS: Record<LocationState, string> = {
  draft: "Draft",
  preview: "Preview",
  live: "Live",
  paused: "Paused",
};

/** Whether the public sees the location's pages: it is live, or paused. */
export function isPublicState(state: LocationState) {
  return state === "live" || state === "paused";
}

/** The state every new location starts in. */
export const NEW_LOCATION_STATE: LocationState = "draft";

/** The moves Marketing can make from each state, the usual one first. */
export const LOCATION_STATE_MOVES: Record<
  LocationState,
  readonly LocationState[]
> = {
  draft: ["preview"],
  preview: ["live", "draft"],
  live: ["paused"],
  paused: ["live"],
};

/** What the rules on a location's state and switches read of one of its pages. */
export type PageStanding = {
  page: LocationPageKey;
  isOn: boolean;
  status: PageStatus;
};

/**
 * Why a location cannot make the move, as sentences that say what to do;
 * empty when it can. Leaving `draft` and going public from `preview` both
 * need the landing page and a product page on, and going public also needs
 * every page that is on to be published as it is drafted, so what staff
 * checked in preview is what goes public. Nothing is checked after the move:
 * a paused location resumes as it is, since its pages never stopped being
 * public.
 */
export function stateMoveBlockers(
  from: LocationState,
  to: LocationState,
  pages: readonly PageStanding[],
): string[] {
  if (!LOCATION_STATE_MOVES[from].includes(to)) {
    return [
      `A ${LOCATION_STATE_LABELS[from].toLowerCase()} location cannot move to ${LOCATION_STATE_LABELS[to].toLowerCase()}.`,
    ];
  }
  const leavesDraft = from === "draft" && to === "preview";
  const goesPublic = from === "preview" && to === "live";
  if (!leavesDraft && !goesPublic) return [];

  const blockers: string[] = [];
  const on = pages.filter((page) => page.isOn);
  const landingOn = on.some((page) => page.page === LANDING_PAGE);
  const productOn = on.some((page) => page.page !== LANDING_PAGE);
  if (!landingOn && !productOn) {
    blockers.push("Switch on the landing page and at least one product page");
  } else if (!landingOn) {
    blockers.push("Switch on the landing page");
  } else if (!productOn) {
    blockers.push("Switch on at least one product page");
  }
  if (goesPublic) {
    for (const page of on) {
      if (page.status === "changed") {
        blockers.push(`Publish the changes on ${pageNameOf(page.page)}`);
      }
    }
  }
  return blockers;
}

/**
 * Whether a page's On switch can be set. A page goes on once it has a
 * published copy. The landing page stays on once the location has left
 * `draft`; the product pages can go off at any time.
 */
export function checkPageSwitch(
  state: LocationState,
  page: Pick<PageStanding, "page" | "status">,
  isOn: boolean,
): Change {
  if (isOn && page.status === "unpublished") {
    return fail("Publish the page before switching it on.");
  }
  if (!isOn && page.page === LANDING_PAGE && state !== "draft") {
    return fail(
      "The landing page stays on once the location has left draft. Pause the location instead.",
    );
  }
  return { ok: true };
}

/** How many locations the home page shows as top choices. */
export const TOP_CHOICE_CAP = 3;

/** What Marketing does to a location's place among the top choices. */
export const TOP_CHOICE_CHANGES = ["add", "remove", "up", "down"] as const;
export type TopChoiceChange = (typeof TOP_CHOICE_CHANGES)[number];
export const isTopChoiceChange = guardFor(TOP_CHOICE_CHANGES);

export const LOCATION_LIMITS = {
  /** Characters. */
  name: 60,
  slug: 60,
  tagline: 80,
  addressName: 60,
  /** Saved addresses per location. The list is a shortcut, not a directory. */
  addresses: 20,
} as const;

/**
 * Slugs a location cannot take, because the address is or will be something
 * else. A new top-level route on the customer site is added to `SITE_PATHS`
 * in the same PR.
 */
const SITE_PATHS = [
  "account",
  "booking",
  "preview",
  "sign-in",
  "sign-up",
  "api",
];
const LOCALE_CODES = ["en", "ms", "zh"];
/** Set aside by `04-location-and-seo-architecture.md` for routes still to come. */
const SET_ASIDE = [
  "admin",
  "search",
  "manage",
  "quote",
  "packages",
  "vehicles",
  "transfer",
  "driver",
  "sitemap",
  "robots",
];
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  ...SITE_PATHS,
  ...TRIP_CATEGORIES,
  ...LOCALE_CODES,
  ...SET_ASIDE,
]);

/** A slug is what `slugify` makes, within the limit and not reserved. */
export function checkLocationSlug(slug: string): Change {
  if (slug === "") return fail("Enter the slug.");
  if (slug !== slugify(slug)) {
    return fail(
      "A slug is lower-case letters, digits and dashes, such as kuala-kubu-bharu.",
    );
  }
  if (slug.length > LOCATION_LIMITS.slug) {
    return fail(`The slug is at most ${LOCATION_LIMITS.slug} characters.`);
  }
  if (RESERVED_SLUGS.has(slug)) {
    return fail(`The site uses /${slug} for something else. Choose another.`);
  }
  return { ok: true };
}

/** The slug is Marketing's to change until the location first goes live. */
export function isSlugLocked(location: { wentLiveAt: Date | null }) {
  return location.wentLiveAt !== null;
}

/** What Marketing enters about a location. */
export type LocationFields = {
  name: string;
  slug: string;
  /** The short line on a home page card; null when left empty. */
  tagline: string | null;
  /** The codes of the districts it lies in, each once, sorted. At least one. */
  districtCodes: string[];
};

/** How the activity log names each field: "Changed the slug and the tagline". */
export const LOCATION_FIELD_LABELS = {
  name: "the name",
  slug: "the slug",
  tagline: "the tagline",
  districtCodes: "the districts",
} as const;

export function checkLocationFields(fields: LocationFields): Change {
  if (fields.name === "") return fail("Enter the name.");
  if (fields.name.length > LOCATION_LIMITS.name) {
    return fail(`The name is at most ${LOCATION_LIMITS.name} characters.`);
  }
  const slug = checkLocationSlug(fields.slug);
  if (!slug.ok) return slug;
  if (
    fields.tagline !== null &&
    fields.tagline.length > LOCATION_LIMITS.tagline
  ) {
    return fail(
      `The tagline is at most ${LOCATION_LIMITS.tagline} characters.`,
    );
  }
  if (fields.districtCodes.length === 0) {
    return fail("Tick at least one district.");
  }
  return { ok: true };
}

/** District codes as a location keeps them: each once, sorted. */
export function districtCodesOf(values: unknown): string[] {
  const codes = Array.isArray(values) ? values.map(textOf) : [];
  return [...new Set(codes.filter((code) => code !== ""))].sort();
}

/**
 * The location form's `name`, `slug` and `tagline`, and its ticked
 * `districts` as a list, read and checked. Whether each code is a real
 * district is the writer's check.
 */
export function parseLocationFields(
  values: Record<string, unknown>,
): Parsed<LocationFields> {
  const fields: LocationFields = {
    name: textOf(values.name),
    slug: textOf(values.slug),
    tagline: textOf(values.tagline) || null,
    districtCodes: districtCodesOf(values.districts),
  };
  const check = checkLocationFields(fields);
  return check.ok ? { ok: true, value: fields } : check;
}

/**
 * One row of the saved addresses form: an address the list already holds,
 * by its id, or a new one by the Google place id the search answered. The
 * name is what the customer reads, and is Marketing's to change.
 */
export type AddressEntry =
  { id: string; name: string } | { placeId: string; name: string };

/** The names of a list of saved addresses: each filled, in the limit, used once. */
export function checkAddressNames(names: readonly string[]): Change {
  if (names.length > LOCATION_LIMITS.addresses) {
    return fail(
      `A location keeps at most ${LOCATION_LIMITS.addresses} saved addresses.`,
    );
  }
  const seen = new Set<string>();
  for (const name of names) {
    if (name === "") return fail("Give every address a name.");
    if (name.length > LOCATION_LIMITS.addressName) {
      return fail(
        `An address name is at most ${LOCATION_LIMITS.addressName} characters.`,
      );
    }
    const key = name.toLowerCase();
    if (seen.has(key)) return fail(`Two addresses are named ${name}.`);
    seen.add(key);
  }
  return { ok: true };
}

const UNREADABLE: Parsed<never> = {
  ok: false,
  error: "The list of addresses could not be read. Reload and try again.",
};

/**
 * The saved addresses form's list, in the order Marketing set, read and
 * checked: `[{ id: "...", name: "Kuah Jetty" }, { placeId: "...", name:
 * "Langkawi Airport" }]`.
 */
export function parseAddressEntries(rows: unknown): Parsed<AddressEntry[]> {
  if (!Array.isArray(rows)) return UNREADABLE;

  const entries: AddressEntry[] = [];
  const ids = new Set<string>();
  for (const row of rows as unknown[]) {
    if (typeof row !== "object" || row === null) return UNREADABLE;
    const { id, placeId, name } = row as Record<string, unknown>;
    if (typeof id === "string" && id !== "") {
      if (ids.has(id)) return UNREADABLE;
      ids.add(id);
      entries.push({ id, name: textOf(name) });
    } else if (typeof placeId === "string" && placeId !== "") {
      entries.push({ placeId, name: textOf(name) });
    } else {
      return UNREADABLE;
    }
  }
  const check = checkAddressNames(entries.map((entry) => entry.name));
  return check.ok ? { ok: true, value: entries } : check;
}
