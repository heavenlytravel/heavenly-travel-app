import { TRIP_CATEGORIES } from "./booking-status";
import type { Change } from "./change";
import { guardFor } from "./const-enum";
import { textOf, type Parsed } from "./fields";
import {
  LANDING_PAGE,
  isPagePublished,
  pageNameOf,
  type LocationPageKey,
  type PageStatus,
} from "./location-page-input";
import { andList } from "./names";
import { slugify } from "./slug";

/**
 * What the Locations screens edit and the rules they check, pure and
 * browser-safe: the forms display the messages, the writers in ./locations
 * apply the same checks before they write. See
 * docs/261001-locations-and-pages.md and docs/261003-location-flow.md.
 */

const fail = (error: string): Change => ({ ok: false, error });

/** What the public sees of a location. The state is the location's, not its district's. */
export const LOCATION_STATES = ["draft", "live", "paused"] as const;
export type LocationState = (typeof LOCATION_STATES)[number];
export const isLocationState = guardFor(LOCATION_STATES);
export const LOCATION_STATE_LABELS: Record<LocationState, string> = {
  draft: "Draft",
  live: "Live",
  paused: "Paused",
};

/** Whether the public sees the location's pages: it is live, or paused. */
export function isPublicState(state: LocationState) {
  return state === "live" || state === "paused";
}

/** The state every new location starts in. */
export const NEW_LOCATION_STATE: LocationState = "draft";

/** A stored state as the rules read it. A value that is not a state reads as the first one. */
export function locationStateOf(value: string): LocationState {
  return isLocationState(value) ? value : NEW_LOCATION_STATE;
}

/**
 * The one move Marketing can make from each state. A location that has been
 * live never returns to `draft`: it is paused and resumed.
 */
export const LOCATION_STATE_MOVE: Record<LocationState, LocationState> = {
  draft: "live",
  live: "paused",
  paused: "live",
};

/** What the button of each state's move says. */
export const LOCATION_MOVE_LABELS: Record<LocationState, string> = {
  draft: "Go live",
  live: "Pause",
  paused: "Resume",
};

/** What the rules on a location's state read of one of its pages. */
export type PageStanding = {
  page: LocationPageKey;
  status: PageStatus;
};

/**
 * What the rules on a location's state read of its operation: where it
 * lies, what it sells, what it covers and how it prices.
 */
export type OperationStanding = {
  /** The names of the states it lies in, by name. */
  stateNames: string[];
  /** Offerings on sale. */
  classesOnSale: number;
  /** Zones, which are the coverage, and routes between them with a price. */
  zones: number;
  routesPriced: number;
};

/**
 * The steps that set a location up, in the order the console walks an
 * admin through them: the classes come before the coverage because the
 * rate grid's columns are the classes on sale. Each is a tab of the
 * location's page, and a location goes live once every step is done. See
 * docs/261015-locations-as-operation-areas.md, "Setting a location up".
 */
export const SETUP_STEPS = [
  "details",
  "vehicle-classes",
  "coverage",
  "pages",
] as const;
export type SetupStepKey = (typeof SETUP_STEPS)[number];

export const SETUP_STEP_LABELS: Record<SetupStepKey, string> = {
  details: "Details",
  "vehicle-classes": "Vehicle classes",
  coverage: "Coverage",
  pages: "Pages",
};

/** One step of a location's setup, as the checklist shows it. */
export type SetupStep = {
  key: SetupStepKey;
  /** The tab's name. */
  title: string;
  /** What is there now, one line: "1 of 2 districts on". */
  status: string;
  /** What to do before the location can go live; empty when the step is done. */
  todos: string[];
  done: boolean;
};

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * Where each step of the setup stands. Going live needs the landing page
 * published and no published page with edits waiting, so what staff checked
 * on the preview page is what goes public; a class on sale, so the search
 * card has something to sell; and a zone, since the zones are the
 * coverage and a location with none serves no pickup. A route on the grid
 * is not required: a trip inside a zone with no row is metered at the
 * class's rates. No product page is needed: a landing page with none
 * published shows no product links and still carries the search card.
 */
export function setupSteps(
  pages: readonly PageStanding[],
  operation: OperationStanding,
): SetupStep[] {
  const step = (
    key: SetupStepKey,
    status: string,
    todos: string[],
  ): SetupStep => ({
    key,
    title: SETUP_STEP_LABELS[key],
    status,
    todos,
    done: todos.length === 0,
  });

  const landing = pages.find((page) => page.page === LANDING_PAGE);
  const landingOn = landing !== undefined && isPagePublished(landing.status);
  const productsOn = pages.filter(
    (page) => page.page !== LANDING_PAGE && isPagePublished(page.status),
  ).length;
  const pageTodos: string[] = [];
  if (!landingOn) pageTodos.push("Publish the landing page");
  for (const page of pages) {
    if (page.status === "changed") {
      pageTodos.push(`Publish the changes on ${pageNameOf(page.page)}`);
    }
  }

  return [
    step(
      "details",
      operation.stateNames.length === 0
        ? "No state yet"
        : andList(operation.stateNames),
      operation.stateNames.length === 0
        ? ["Tick at least one state on the Details tab"]
        : [],
    ),
    step(
      "vehicle-classes",
      operation.classesOnSale === 0
        ? "Nothing on sale yet"
        : `${plural(operation.classesOnSale, "class", "classes")} on sale`,
      operation.classesOnSale === 0
        ? [
            "Put at least one vehicle class on sale, with its rates, on the Vehicle classes tab",
          ]
        : [],
    ),
    step(
      "coverage",
      operation.zones === 0 ? "No zones yet" : plural(operation.zones, "zone"),
      operation.zones === 0
        ? [
            "Draw at least one zone on the Coverage tab; the zones are what the location serves",
          ]
        : [],
    ),
    step(
      "pages",
      [
        landingOn ? "Landing page published" : "Landing page not published",
        productsOn > 0
          ? `${plural(productsOn, "product page")} published`
          : null,
        pageTodos.some((todo) => todo.startsWith("Publish the changes"))
          ? "edits waiting"
          : null,
      ]
        .filter((part) => part !== null)
        .join(", "),
      pageTodos,
    ),
  ];
}

/** How far the setup has come: the steps done, of all, and the first not done. */
export function setupProgress(steps: readonly SetupStep[]) {
  return {
    done: steps.filter((step) => step.done).length,
    total: steps.length,
    next: steps.find((step) => !step.done) ?? null,
  };
}

/**
 * Why a location cannot make the move, as sentences that say what to do;
 * empty when it can. Going live from `draft` needs every setup step done.
 * Nothing is checked after the move: a paused location resumes as it is,
 * since its pages never stopped being public.
 */
export function stateMoveBlockers(
  from: LocationState,
  to: LocationState,
  pages: readonly PageStanding[],
  operation: OperationStanding,
): string[] {
  if (LOCATION_STATE_MOVE[from] !== to) {
    return [
      `A ${LOCATION_STATE_LABELS[from].toLowerCase()} location cannot move to ${LOCATION_STATE_LABELS[to].toLowerCase()}.`,
    ];
  }
  if (from !== "draft") return [];
  return setupSteps(pages, operation).flatMap((step) => step.todos);
}

/**
 * Whether a page can be unpublished: taken from the public, its text kept.
 * The landing page stays published once the location has left `draft`,
 * since the location's address must not become a 404; the product pages can
 * be unpublished at any time.
 */
export function checkPageUnpublish(
  state: LocationState,
  page: LocationPageKey,
): Change {
  if (page === LANDING_PAGE && state !== "draft") {
    return fail(
      "The landing page stays published once the location has left draft. Pause the location instead.",
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

/** Whether the location has ever been public: live now, paused, or once either. */
export function hasBeenLive(location: { wentLiveAt: Date | null }) {
  return location.wentLiveAt !== null;
}

/**
 * The slug is Marketing's to change until the location first goes live. A
 * slug that is wrong after that is put right by deleting the location and
 * adding it again.
 */
export function isSlugLocked(location: { wentLiveAt: Date | null }) {
  return hasBeenLive(location);
}

/**
 * Whether a location can be deleted. One that has never been live goes on a
 * plain yes: nothing of it was public. One that has been live has a public
 * address, which the delete turns into a 404 that links break on and search
 * engines drop, so the admin types its slug to say they mean it. `typed`
 * is what they typed; null when nothing was asked.
 */
export function checkLocationDelete(
  location: { slug: string; wentLiveAt: Date | null },
  typed: string | null,
): Change {
  if (!hasBeenLive(location) || typed === location.slug) return { ok: true };
  return fail(
    `Type the slug, ${location.slug}, to delete a location that has been live.`,
  );
}

/**
 * What Marketing enters about a location: the three things only a person
 * can say. The tagline is on the landing page, with the rest of its copy.
 */
export type LocationFields = {
  name: string;
  slug: string;
  /** The codes of the states it lies in, each once, sorted. At least one. */
  stateCodes: string[];
};

/** How the activity log names each field: "Changed the slug and the states". */
export const LOCATION_FIELD_LABELS = {
  name: "the name",
  slug: "the slug",
  stateCodes: "the states",
} as const;

export function checkLocationFields(fields: LocationFields): Change {
  if (fields.name === "") return fail("Enter the name.");
  if (fields.name.length > LOCATION_LIMITS.name) {
    return fail(`The name is at most ${LOCATION_LIMITS.name} characters.`);
  }
  const slug = checkLocationSlug(fields.slug);
  if (!slug.ok) return slug;
  if (fields.stateCodes.length === 0) {
    return fail("Tick at least one state.");
  }
  return { ok: true };
}

/** State codes as a location keeps them: each once, sorted. */
export function stateCodesOf(values: unknown): string[] {
  const codes = Array.isArray(values) ? values.map(textOf) : [];
  return [...new Set(codes.filter((code) => code !== ""))].sort();
}

/**
 * The location form's `name` and `slug`, and its ticked `states` as a
 * list, read and checked. Whether each code is a real state is the
 * writer's check.
 */
export function parseLocationFields(
  values: Record<string, unknown>,
): Parsed<LocationFields> {
  const fields: LocationFields = {
    name: textOf(values.name),
    slug: textOf(values.slug),
    stateCodes: stateCodesOf(values.states),
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
