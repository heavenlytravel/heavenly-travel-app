"use client";

import { searchTermOf, type Permission } from "@repo/db";
import {
  CommandPalette,
  CommandPaletteTrigger,
  type CommandPaletteGroup,
} from "@repo/ui/command-palette";
import { CirclePlusIcon, SearchIcon } from "@repo/ui/icons";
import { SidebarDockButton, useSidebar } from "@repo/ui/sidebar";
import { usePathname, useRouter } from "next/navigation";
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
import { SEARCH_PARAM, SEARCH_PATH, scopeOfPath } from "../_lib/routes";
import type { SidebarLocation } from "./AppSidebar";
import { LocationMark } from "./LocationMark";
import { MENU_ICONS, type MenuIcon } from "./menu";
import {
  entriesMatching,
  paletteIndex,
  type PaletteEntry,
} from "./palette-index";
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

/** Opens the palette, for a button that does: the header's box, the dock's search. */
const OpenSearchContext = createContext<(() => void) | null>(null);

function useOpenSearch() {
  const open = useContext(OpenSearchContext);
  if (!open) throw new Error("A search button needs ConsoleSearch round it.");
  return open;
}

/**
 * The console's search: the command palette, which the box in the header
 * (`SearchBox`) and the search in a phone's dock (`DockSearch`) open, as
 * Ctrl or Cmd + K does from anywhere. Round the console, so each of them
 * reaches it. Before anything is typed it lists
 * the pages of the scope on screen and what the admin may add. As they
 * type it finds, in groups, the pages (across locations and each
 * location's), the actions, the locations, and, asked of the server, the
 * bookings, vehicles, drivers, users, classes and zones that match, every
 * location whatever the picker is on. Only what the admin may open is
 * offered. Enter or a click opens it. See docs/261023-console-sidebar.md.
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
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const term = searchTermOf(text);
  const recordTerm = term && term.length >= MIN_RECORD_SEARCH ? term : null;

  const index = useMemo(
    () =>
      paletteIndex({ permissions, locations, scope: scopeOfPath(pathname) }),
    [permissions, locations, pathname],
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

  const groups = useMemo((): CommandPaletteGroup[] => {
    const local = term
      ? [
          {
            key: "pages",
            heading: "Pages",
            entries: entriesMatching(index.pages, term).slice(0, PAGES_SHOWN),
          },
          {
            key: "actions",
            heading: "Actions",
            entries: entriesMatching(index.actions, term),
          },
          {
            key: "locations",
            heading: "Locations",
            entries: entriesMatching(index.locations, term),
          },
        ]
      : [
          { key: "pages", heading: "Pages", entries: index.pagesHere },
          {
            key: "actions",
            heading: "Actions",
            entries: index.actions.filter((entry) => !entry.meta),
          },
        ];
    return [
      ...local
        .filter((group) => group.entries.length > 0)
        .map((group) => ({
          key: group.key,
          heading: group.heading,
          items: group.entries.map((entry) => ({
            key: `${group.key}:${entry.href}`,
            value: entry.href,
            content: (
              <EntryRow entry={entry} action={group.key === "actions"} />
            ),
          })),
        })),
      ...records.map((group) => ({
        key: group.kind,
        heading: RECORD_KIND_LABELS[group.kind],
        items: group.hits.map((hit) => ({
          key: `${group.kind}:${hit.href}`,
          value: hit.href,
          content: <HitRow hit={hit} icon={KIND_ICONS[group.kind]} />,
        })),
      })),
    ];
  }, [term, index, records]);

  const status =
    !term || groups.length > 0 || pending
      ? null
      : answer?.failed && recordTerm
        ? "The search failed. Try again."
        : `No results for “${term}”.`;

  const openSearch = useCallback(() => setOpen(true), []);

  const close = (next: boolean) => {
    setOpen(next);
    // Closed, it starts afresh: no text, and no records of the last search.
    if (!next) {
      setText("");
      setAnswer(null);
    }
  };

  return (
    <OpenSearchContext.Provider value={openSearch}>
      {children}
      <CommandPalette
        label="Search the console"
        placeholder="Search pages, bookings, plates, people…"
        open={open}
        onOpenChange={close}
        value={text}
        onValueChange={setText}
        groups={groups}
        pending={pending}
        status={status}
        onChoose={(href) => {
          close(false);
          router.push(href);
        }}
      />
    </OpenSearchContext.Provider>
  );
}

/** The box in the header that opens the search, from `md` up; a phone has the dock's. */
export function SearchBox() {
  const openSearch = useOpenSearch();
  return (
    <CommandPaletteTrigger
      label="Search"
      onOpen={openSearch}
      className="max-w-xs max-md:hidden"
    />
  );
}

/** The search in a phone's dock. Pressed over the menu, the menu makes way for it. */
export function DockSearch() {
  const openSearch = useOpenSearch();
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarDockButton
      onClick={() => {
        setOpenMobile(false);
        openSearch();
      }}
    >
      <SearchIcon />
      Search
    </SidebarDockButton>
  );
}

/** A page, an action or a location: its icon or mark, its name, and where it is. */
function EntryRow({ entry, action }: { entry: PaletteEntry; action: boolean }) {
  const Icon = action
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
