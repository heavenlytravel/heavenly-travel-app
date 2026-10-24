"use client";

import { searchTermOf, type Permission } from "@repo/db";
import {
  CommandPalette,
  CommandPaletteTrigger,
  type CommandPaletteGroup,
} from "@repo/ui/command-palette";
import { CirclePlusIcon, SearchIcon, XIcon } from "@repo/ui/icons";
import { SidebarDock, SidebarDockButton, useSidebar } from "@repo/ui/sidebar";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  RECORD_KIND_LABELS,
  type RecordKind,
  type SearchHit,
  type SearchResponse,
} from "../_lib/console-search";
import { SEARCH_PARAM, SEARCH_PATH } from "../_lib/routes";
import type { SidebarLocation } from "./AppSidebar";
import { LocationMark } from "./LocationMark";
import { MENU_ICONS, type MenuIcon } from "./menu";
import {
  entriesMatching,
  paletteIndex,
  type PaletteEntry,
} from "./palette-index";
import { useRecent, type RecentEntry } from "./palette-recent";
import { BookingStatusBadge } from "./StatusBadges";

/** How long the typing rests before the records are asked for. */
const PAUSE_MS = 200;

/** The fewest letters the records are asked for at; a page is found at one. */
const MIN_RECORD_SEARCH = 2;

/** How many pages the palette lists for a search; the most likely come first. */
const PAGES_SHOWN = 8;

/** Each kind of record's icon, as its row in the sidebar has it. */
const KIND_ICONS: Record<RecordKind, MenuIcon> = {
  bookings: "bookings",
  vehicles: "vehicles",
  drivers: "drivers",
  users: "users",
  "vehicle-classes": "vehicle-classes",
  zones: "coverage",
};

/** The last answer, for the text it was asked for; `failed` when the search could not be made. */
type Answer = {
  term: string;
  groups: SearchResponse["groups"];
  failed: boolean;
};

/** The palette's state, for a button that opens it or closes it: the header's box, the dock's search. */
const SearchContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

function useSearch() {
  const search = useContext(SearchContext);
  if (!search) throw new Error("A search button needs ConsoleSearch round it.");
  return search;
}

/** What is kept of a row as it is opened: all but the words it is found by. */
function keptOf({
  href,
  title,
  meta,
  icon,
  location,
}: PaletteEntry): RecentEntry {
  return { href, title, meta, icon, location };
}

/** A group of rows the palette finds in the browser. */
type EntryGroup = { key: string; heading: string; entries: RecentEntry[] };

/**
 * The console's search: the command palette, which the box in the header
 * (`SearchBox`) and the search in a phone's dock (`ConsoleDock`) open, as
 * Ctrl or Cmd + K does from anywhere. Round the console, so each of them
 * reaches it. Before anything is typed it lists the last rows opened from
 * it (`useRecent`) and what the admin may add; the pages are the
 * sidebar's. As they type it finds, in groups, the pages (across
 * locations and each location's), the actions, the locations, and, asked
 * of the server, the bookings, vehicles, drivers, users, classes and
 * zones that match, every location whatever the picker is on. Only what
 * the admin may open is offered. Enter or a click opens it. See
 * docs/261023-console-sidebar.md.
 */
export function ConsoleSearch({
  locations,
  permissions,
  children,
}: {
  locations: readonly SidebarLocation[];
  permissions: readonly Permission[];
  children: ReactNode;
}) {
  const router = useRouter();
  const { recent, remember } = useRecent();
  const [open, setOpenState] = useState(false);
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const term = searchTermOf(text);
  const recordTerm = term && term.length >= MIN_RECORD_SEARCH ? term : null;

  const index = useMemo(
    () => paletteIndex({ permissions, locations }),
    [permissions, locations],
  );

  useEffect(() => {
    if (!recordTerm) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ [SEARCH_PARAM]: recordTerm });
      try {
        const response = await fetch(`${SEARCH_PATH}?${params}`, {
          signal: controller.signal,
        });
        const body = response.ok
          ? ((await response.json()) as SearchResponse)
          : null;
        setAnswer({
          term: recordTerm,
          groups: body?.groups ?? [],
          failed: body === null,
        });
      } catch {
        if (!controller.signal.aborted) {
          setAnswer({ term: recordTerm, groups: [], failed: true });
        }
      }
    }, PAUSE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [recordTerm]);

  // While the next answer is on its way the last one stays, so the rows do not flicker.
  const pending = recordTerm !== null && answer?.term !== recordTerm;
  const records = useMemo(
    () => (recordTerm && answer ? answer.groups : []),
    [recordTerm, answer],
  );

  // The rows, and each row's entry by its page, kept as it is opened.
  const { groups, entries } = useMemo(() => {
    const actions = (list: readonly PaletteEntry[]): RecentEntry[] =>
      list.map((entry) => ({ ...keptOf(entry), action: true }));
    const plain = (list: readonly PaletteEntry[]): RecentEntry[] =>
      list.map(keptOf);
    const local: EntryGroup[] = term
      ? [
          {
            key: "pages",
            heading: "Pages",
            entries: plain(entriesMatching(index.pages, term)).slice(
              0,
              PAGES_SHOWN,
            ),
          },
          {
            key: "actions",
            heading: "Actions",
            entries: actions(entriesMatching(index.actions, term)),
          },
          {
            key: "locations",
            heading: "Locations",
            entries: plain(entriesMatching(index.locations, term)),
          },
        ]
      : [
          { key: "recent", heading: "Recent", entries: recent },
          {
            key: "actions",
            heading: "Actions",
            entries: actions(index.actions.filter((entry) => !entry.meta)),
          },
        ];
    const found = records.map((group) => ({
      kind: group.kind,
      hits: group.hits.map((hit) => ({
        hit,
        entry: {
          href: hit.href,
          title: hit.title,
          meta: hit.meta,
          icon: KIND_ICONS[group.kind],
        } satisfies RecentEntry,
      })),
    }));
    const entries = new Map<string, RecentEntry>();
    for (const group of local) {
      for (const entry of group.entries) entries.set(entry.href, entry);
    }
    for (const group of found) {
      for (const { entry } of group.hits) entries.set(entry.href, entry);
    }
    const groups: CommandPaletteGroup[] = [
      ...local
        .filter((group) => group.entries.length > 0)
        .map((group) => ({
          key: group.key,
          heading: group.heading,
          items: group.entries.map((entry) => ({
            key: `${group.key}:${entry.href}`,
            value: entry.href,
            content: <EntryRow entry={entry} />,
          })),
        })),
      ...found.map((group) => ({
        key: group.kind,
        heading: RECORD_KIND_LABELS[group.kind],
        items: group.hits.map(({ hit, entry }) => ({
          key: `${group.kind}:${hit.href}`,
          value: hit.href,
          content: <HitRow hit={hit} icon={entry.icon} />,
        })),
      })),
    ];
    return { groups, entries };
  }, [term, index, records, recent]);

  const status =
    !term || groups.length > 0 || pending
      ? null
      : answer?.failed && recordTerm
        ? "The search failed. Try again."
        : `No results for “${term}”.`;

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    // Closed, it starts afresh: no text, and no records of the last search.
    if (!next) {
      setText("");
      setAnswer(null);
    }
  }, []);
  const search = useMemo(() => ({ open, setOpen }), [open, setOpen]);

  return (
    <SearchContext.Provider value={search}>
      {children}
      <CommandPalette
        label="Search the console"
        placeholder="Search pages, bookings, plates, people…"
        open={open}
        onOpenChange={setOpen}
        value={text}
        onValueChange={setText}
        groups={groups}
        pending={pending}
        status={status}
        onChoose={(href) => {
          const entry = entries.get(href);
          if (entry) remember(entry);
          setOpen(false);
          router.push(href);
        }}
        dock={<ConsoleDock />}
      />
    </SearchContext.Provider>
  );
}

/** The box in the header that opens the search, from `md` up; a phone has the dock's. */
export function SearchBox() {
  const { setOpen } = useSearch();
  return (
    <CommandPaletteTrigger
      label="Search"
      onOpen={() => setOpen(true)}
      className="max-w-xs max-md:hidden"
    />
  );
}

/**
 * The bar at a phone's foot: the search, then the menu. Each turns into
 * the way to close what it opened, and opening one closes the other. Drawn
 * on the page, and again over the menu's panel and the palette.
 */
export function ConsoleDock() {
  const { open, setOpen } = useSearch();
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarDock onMenu={() => setOpen(false)}>
      <SidebarDockButton
        aria-expanded={open}
        onClick={() => {
          if (!open) setOpenMobile(false);
          setOpen(!open);
        }}
      >
        {open ? <XIcon /> : <SearchIcon />}
        {open ? "Close" : "Search"}
      </SidebarDockButton>
    </SidebarDock>
  );
}

/** A page, an action or a location: its icon or mark, its name, and where it is. */
function EntryRow({ entry }: { entry: RecentEntry }) {
  const Icon = entry.action
    ? CirclePlusIcon
    : entry.icon
      ? MENU_ICONS[entry.icon]
      : null;
  return (
    <>
      {entry.location ? (
        <LocationMark name={entry.location.name} state={entry.location.state} />
      ) : Icon ? (
        <Icon />
      ) : null}
      <span className="min-w-0 flex-1 truncate">{entry.title}</span>
      {entry.meta ? (
        <span className="shrink-0 text-xs text-slate-500">{entry.meta}</span>
      ) : null}
    </>
  );
}

/** A record found: its kind's icon, its name with a booking's status, the line under it, and its location. */
function HitRow({ hit, icon }: { hit: SearchHit; icon: MenuIcon }) {
  const Icon = MENU_ICONS[icon];
  return (
    <>
      <Icon />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-slate-900 tabular-nums">
            {hit.title}
          </span>
          {hit.status ? <BookingStatusBadge status={hit.status} /> : null}
        </span>
        {hit.detail ? (
          <span className="truncate text-xs text-slate-500">{hit.detail}</span>
        ) : null}
      </span>
      {hit.meta ? (
        <span className="shrink-0 text-xs text-slate-500">{hit.meta}</span>
      ) : null}
    </>
  );
}
