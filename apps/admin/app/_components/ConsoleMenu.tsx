"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { cx } from "@repo/ui/cx";
import { ChevronLeftIcon, ChevronRightIcon } from "@repo/ui/icons";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebarCollapsed,
} from "@repo/ui/sidebar";
import {
  MENU_ICONS,
  entryOnScreen,
  rowOnScreen,
  type Menu,
  type MenuCount,
  type MenuMark,
  type MenuRow,
} from "./menu";
import { LocationMark } from "./LocationMark";
import { StepMark } from "./StepMark";

/** A link in the sidebar that keeps the menu's panel open on a phone: a drill's row, which opens its menu there. */
export const KEEPS_PANEL = "[data-keeps-panel]";

const DOTS = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  grey: "bg-slate-300",
} as const;

const COUNT_TONES = {
  brand: "bg-brand text-white",
  amber: "bg-amber-100 text-amber-800",
} as const;

/**
 * A scope's menu in the sidebar: its parts under their names (a line
 * apart on the rail, where names do not fit), each row a
 * section with its icon and, where something waits on it, a count. The
 * row of the section on screen is marked. A row with a chevron is a
 * drill: while one of its pages is on screen, its pages take the menu's
 * place under its name and a way back, so the sidebar holds that section
 * alone. It opens as its row is pressed, before its page has come, and
 * comes in from the side, as the menu does coming back (`.ui-swap-in`).
 * Back shows the menu again with the page left as it is; the drill
 * returns with the next page of it opened, or its row pressed. Collapsed
 * to a rail, the menu is its rows' icons alone, with each row's line as
 * its tooltip, and no drill. See docs/261023-console-sidebar.md.
 */
export function ConsoleMenu({ menu }: { menu: Menu }) {
  const pathname = usePathname();
  const collapsed = useSidebarCollapsed();
  // The path at which the admin went back from a drill to the menu.
  const [backAt, setBackAt] = useState<string | null>(null);
  // The drill whose row was pressed, and the path it was pressed at: it
  // shows until the page it opens has come.
  const [pressed, setPressed] = useState<{ key: string; at: string } | null>(
    null,
  );
  // The row to focus once the menu is back, and whether to focus the way
  // back once a drill opens from its row, so focus is never lost.
  const refocus = useRef<string | null>(null);
  const focusBackRef = useRef(false);
  const nav = useRef<HTMLElement>(null);

  // Once the page has come, or another, the press is spent.
  if (pressed && pressed.at !== pathname) setPressed(null);

  const current = rowOnScreen(menu, pathname);
  const opening =
    pressed?.at === pathname
      ? menu.parts
          .flatMap((part) => part.rows)
          .find((row) => row.key === pressed.key)
      : undefined;
  const drill = collapsed
    ? null
    : (opening ?? (current?.drill && backAt !== pathname ? current : null));

  // What shows, the menu or a drill, and the side the last change came
  // from: none on the first paint, so a page opens without it, and none
  // once it is in, so the menu's panel on a phone opens without it again.
  const shown = drill?.key ?? null;
  const [last, setLast] = useState(shown);
  const [from, setFrom] = useState<"start" | "end" | undefined>(undefined);
  if (shown !== last) {
    setLast(shown);
    setFrom(shown === null ? "start" : "end");
  }

  useEffect(() => {
    if (drill || !refocus.current) return;
    nav.current
      ?.querySelector<HTMLElement>(`[data-row="${refocus.current}"]`)
      ?.focus();
    refocus.current = null;
  }, [drill]);

  if (drill?.drill) {
    return (
      <DrillMenu
        key={drill.key}
        row={drill}
        backTo={menu.label}
        pathname={pathname}
        from={from}
        onIn={() => setFrom(undefined)}
        focusBackRef={focusBackRef}
        onBack={() => {
          refocus.current = drill.key;
          setBackAt(pathname);
          setPressed(null);
        }}
      />
    );
  }

  return (
    <nav
      ref={nav}
      aria-label={menu.label}
      className="ui-swap-in"
      data-from={from}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setFrom(undefined);
      }}
    >
      {menu.parts.map((part, index) => (
        <Fragment key={part.rows[0]?.key ?? index}>
          {index > 0 && collapsed ? <SidebarSeparator /> : null}
          <SidebarGroup>
            {part.label ? (
              <SidebarGroupLabel>{part.label}</SidebarGroupLabel>
            ) : null}
            <SidebarMenu>
              {part.rows.map((row) => (
                <Row
                  key={row.key}
                  row={row}
                  current={row === current}
                  onOpen={() => {
                    focusBackRef.current = !collapsed;
                    setBackAt(null);
                    setPressed({ key: row.key, at: pathname });
                  }}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </Fragment>
      ))}
      {menu.foot && !collapsed ? (
        <p className="px-4 pb-2 text-xs text-slate-500">{menu.foot}</p>
      ) : null}
    </nav>
  );
}

/** One section's row: its icon and name, then what stands at its end. */
function Row({
  row,
  current,
  onOpen,
}: {
  row: MenuRow;
  current: boolean;
  /** The row of a drill is pressed: its menu opens. */
  onOpen: () => void;
}) {
  const collapsed = useSidebarCollapsed();
  const Icon = MENU_ICONS[row.icon];
  const content = (
    <>
      {row.location ? (
        <LocationMark name={row.location.name} state={row.location.state} />
      ) : (
        <Icon />
      )}
      <SidebarLabel className="min-w-0 flex-1">{row.label}</SidebarLabel>
      {collapsed ? null : <RowEnd row={row} />}
    </>
  );
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        active={current}
        tooltip={row.detail ? `${row.label}: ${row.detail}` : row.label}
      >
        {row.external ? (
          <a
            href={row.href}
            target="_blank"
            rel="noreferrer"
            data-row={row.key}
          >
            {content}
          </a>
        ) : row.drill ? (
          <Link
            href={row.href}
            data-row={row.key}
            data-keeps-panel=""
            onClick={onOpen}
          >
            {content}
          </Link>
        ) : (
          <Link href={row.href} data-row={row.key}>
            {content}
          </Link>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/** What stands at a row's end: its note, its count, its setup mark, a drill's chevron. */
function RowEnd({ row }: { row: MenuRow }) {
  return (
    <>
      {row.note ? (
        <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 text-[11px] leading-[18px] font-medium text-emerald-800 tabular-nums">
          {row.note}
        </span>
      ) : null}
      {row.count ? (
        <>
          <Count count={row.count} />
          {row.detail ? <span className="sr-only">, {row.detail}</span> : null}
        </>
      ) : null}
      <Mark mark={row.mark} />
      {row.drill ? <ChevronRightIcon className="text-slate-400" /> : null}
    </>
  );
}

/** What waits on a row, in a pill at its end. */
function Count({ count }: { count: MenuCount }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "shrink-0 rounded-full px-1.5 text-[11px] leading-[18px] font-semibold tabular-nums",
        COUNT_TONES[count.tone],
      )}
    >
      {count.value}
    </span>
  );
}

/** A setup step's mark at a row's end, ticked once done. */
function Mark({ mark }: { mark: MenuMark | undefined }) {
  return mark ? <StepMark done={mark === "done"} className="size-4" /> : null;
}

/** A drill's pages in the sidebar's place: its name over them, with the way back to the menu. */
function DrillMenu({
  row,
  backTo,
  pathname,
  from,
  onIn,
  focusBackRef,
  onBack,
}: {
  row: MenuRow;
  /** The menu's name, for the way back. */
  backTo: string;
  pathname: string;
  /** The side it comes in from, for `.ui-swap-in`; none on the first paint. */
  from: "start" | "end" | undefined;
  /** It is in: its way in is done. */
  onIn: () => void;
  focusBackRef: { current: boolean };
  onBack: () => void;
}) {
  const back = useRef<HTMLButtonElement>(null);
  const drill = row.drill!;
  // Pressed, before its page has come, the page the row opens is marked.
  const on =
    entryOnScreen(drill.entries, pathname) ??
    drill.entries.find((entry) => entry.href === row.href);

  useEffect(() => {
    if (!focusBackRef.current) return;
    focusBackRef.current = false;
    back.current?.focus();
  }, [focusBackRef]);

  return (
    <nav
      aria-label={drill.label}
      className="ui-swap-in"
      data-from={from}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) onIn();
      }}
    >
      <SidebarGroup>
        <div className="relative flex h-8 items-center justify-center">
          <button
            ref={back}
            type="button"
            onClick={onBack}
            aria-label={`Back to ${backTo}`}
            className="absolute left-0 inline-flex size-8 items-center justify-center rounded-md text-slate-500 outline-hidden transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ChevronLeftIcon />
          </button>
          <span className="truncate px-9 text-sm font-semibold text-slate-900">
            {drill.label}
          </span>
        </div>
        <SidebarMenu className="mt-2">
          {drill.entries.map((entry) => {
            const Icon = MENU_ICONS[entry.icon];
            return (
              <SidebarMenuItem key={entry.key}>
                <SidebarMenuButton asChild active={entry === on}>
                  <Link href={entry.href}>
                    <Icon />
                    {entry.dot ? (
                      <span
                        aria-hidden="true"
                        className={cx(
                          "size-1.5 shrink-0 rounded-full",
                          DOTS[entry.dot],
                        )}
                      />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">
                      {entry.label}
                    </span>
                    {entry.note ? (
                      <span className="max-w-[50%] shrink-0 truncate text-xs text-slate-500 tabular-nums">
                        {entry.note}
                      </span>
                    ) : null}
                    {entry.count ? <Count count={entry.count} /> : null}
                    <Mark mark={entry.mark} />
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroup>
    </nav>
  );
}
