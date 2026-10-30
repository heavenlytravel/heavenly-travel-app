"use client";

import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { cx } from "./cx.js";
import { haptic } from "./haptic.js";
import { MenuIcon, PanelLeftIcon, XIcon } from "./icons.js";
import { backdropClose, ModalBody, onModalClose, useModal } from "./modal.js";
import { Tooltip } from "./tooltip.js";

/**
 * An app sidebar that collapses to a rail of icons, after shadcn's sidebar:
 * a provider owns the open state, a keyboard shortcut (Ctrl or Cmd + B)
 * and a rail toggle it, the state survives reloads in a cookie, and below
 * `md` the same content opens in a panel over the page instead, from a bar
 * that floats at the bottom of the screen. Composed from small
 * pieces so each app decides what goes in the header and the groups.
 */

const COOKIE_NAME = "sidebar_state";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const DESKTOP = "(min-width: 48rem)";

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

/** True where a keypress types: a field, a text area, editable text. */
function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement)
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar needs a SidebarProvider.");
  return context;
}

/**
 * The sidebar's colours: `light`, white with slate words, or `navy`, a
 * navy-to-ink gradient with white words, azure-light icons and the page on
 * screen as a bright white pill. Set on `Sidebar`, read by every piece
 * inside it.
 */
export type SidebarTone = "light" | "navy";

const ToneContext = createContext<SidebarTone>("light");

/** The sidebar's colours, for a piece drawn inside it. */
export function useSidebarTone() {
  return useContext(ToneContext);
}

/** Whether the pieces inside are drawn as icons only. False inside the mobile sheet. */
const CollapsedContext = createContext(false);

export function useSidebarCollapsed() {
  return useContext(CollapsedContext);
}

export function SidebarProvider({
  defaultOpen = true,
  children,
}: {
  /** Read from the `sidebar_state` cookie on the server, so there is no flash. */
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpenState] = useState(defaultOpen);
  const [openMobile, setOpenMobile] = useState(false);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  }, []);

  const toggleSidebar = useCallback(() => {
    if (window.matchMedia(DESKTOP).matches) {
      setOpenState((current) => {
        const next = !current;
        document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
        return next;
      });
    } else {
      setOpenMobile((current) => !current);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (event.key.toLowerCase() !== "b") return;
      // A field that took the keys (the page editor's bold) keeps them.
      if (event.defaultPrevented || isTyping(event.target)) return;
      event.preventDefault();
      toggleSidebar();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);

  const value = useMemo(
    () => ({ open, setOpen, openMobile, setOpenMobile, toggleSidebar }),
    [open, setOpen, openMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={value}>
      <div className="ui:flex ui:min-h-svh ui:w-full">{children}</div>
    </SidebarContext.Provider>
  );
}

/**
 * The sidebar itself. From `md` up it is a sticky column that is 16rem
 * wide open and 3rem collapsed. Below that it is a panel that fills the
 * screen but for a narrow margin, always drawn open, with `dock`, the bar
 * that opened it, floating over its foot where it was: its menu button is
 * now the way to close it. The panel fades in and rises a little
 * (`.ui-pop` in styles.css).
 */
export function Sidebar({
  title,
  dock,
  tone = "light",
  children,
}: {
  /** The panel's accessible name: "Console menu". */
  title: string;
  /** The `SidebarDock` the page has, drawn again over the panel. */
  dock?: ReactNode;
  /** Its colours, on a wide screen and in the panel alike. */
  tone?: SidebarTone;
  children: ReactNode;
}) {
  const { open, openMobile, setOpenMobile } = useSidebar();
  const ref = useModal(openMobile);
  const navy = tone === "navy";

  return (
    <ToneContext.Provider value={tone}>
      <aside
        data-state={open ? "expanded" : "collapsed"}
        className={cx(
          "ui:sticky ui:top-0 ui:hidden ui:h-svh ui:shrink-0 ui:flex-col ui:transition-[width] ui:duration-200 ui:ease-linear ui:motion-reduce:transition-none ui:md:flex",
          navy
            ? "ui:bg-linear-to-b ui:from-navy ui:to-ink ui:text-white/80"
            : "ui:border-r ui:border-card-edge ui:bg-white ui:text-body",
          open ? "ui:w-64" : "ui:w-15",
        )}
      >
        <CollapsedContext.Provider value={!open}>
          {children}
        </CollapsedContext.Provider>
        <SidebarRail />
      </aside>
      {/* No display class on the dialog itself: closed, it must stay hidden. */}
      <dialog
        ref={ref}
        aria-label={title}
        onClose={onModalClose(() => setOpenMobile(false))}
        // The dialog itself, clear around the panel, is the margin over the page.
        {...backdropClose(() => setOpenMobile(false))}
        className={cx(
          "ui-pop ui:fixed ui:inset-0 ui:m-0 ui:size-full ui:max-h-none ui:max-w-none ui:bg-transparent ui:p-0 ui:backdrop:bg-ink/45",
          navy ? "ui:text-white/80" : "ui:text-body",
        )}
      >
        <div
          className={cx(
            "ui-pop-panel",
            PANEL,
            navy
              ? "ui:border-white/10 ui:bg-linear-to-b ui:from-navy ui:to-ink"
              : "ui:border-card-edge ui:bg-white",
          )}
        >
          {/* Room at the foot for the dock, so the last row scrolls clear of it. */}
          <ModalBody open={openMobile} className="ui:h-full ui:pt-2 ui:pb-20">
            <CollapsedContext.Provider value={false}>
              {children}
            </CollapsedContext.Provider>
          </ModalBody>
        </div>
        {dock}
      </dialog>
    </ToneContext.Provider>
  );
}

/**
 * The room a panel over the page takes on a phone: all of it but a narrow
 * margin, so the page shows round it and a tap there closes it. The
 * command palette takes the same room.
 */
const PANEL =
  "ui:absolute ui:inset-2 ui:overflow-hidden ui:rounded-2xl ui:border ui:border-card-edge ui:bg-white ui:shadow-overlay";

/**
 * The bar that floats at the bottom of a phone's screen, over every page:
 * what `children` hold (the search, say), then the button that opens the
 * menu, which turns into the way to close it. Gone from `md` up, where the
 * sidebar stands beside the page. Hand the same bar to `Sidebar` as its
 * `dock`, so it shows over the menu's panel too, and to any other panel
 * it opens. A page keeps room at its foot for it, and toasts rise above
 * it (`--ui-dock-room`).
 */
export function SidebarDock({
  onMenu,
  children,
}: {
  /** The menu button is pressed: close what else the dock opened. */
  onMenu?: () => void;
  children?: ReactNode;
}) {
  const { openMobile, setOpenMobile } = useSidebar();
  return (
    <div className="ui-dock ui:fixed ui:bottom-4 ui:left-1/2 ui:z-(--layer-chrome) ui:flex ui:-translate-x-1/2 ui:items-center ui:gap-1 ui:rounded-full ui:border ui:border-edge ui:bg-white/95 ui:p-1 ui:shadow-overlay ui:backdrop-blur ui:md:hidden">
      {children}
      {children ? (
        <span aria-hidden="true" className="ui:h-5 ui:w-px ui:bg-hairline" />
      ) : null}
      <SidebarDockButton
        aria-label={openMobile ? "Close menu" : "Open menu"}
        aria-expanded={openMobile}
        onClick={() => {
          onMenu?.();
          setOpenMobile(!openMobile);
        }}
      >
        {openMobile ? <XIcon /> : <MenuIcon />}
      </SidebarDockButton>
    </div>
  );
}

/** A button in the dock: an icon, and a word beside it if it has one. A phone feels it pressed. */
export function SidebarDockButton({
  className,
  onClick,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      onClick={(event) => {
        haptic();
        onClick?.(event);
      }}
      className={cx(
        "ui:inline-flex ui:h-11 ui:min-w-11 ui:items-center ui:justify-center ui:gap-2 ui:rounded-full ui:px-3 ui:text-sm ui:font-medium ui:text-body ui:transition-colors ui:hover:bg-hairline ui:hover:text-body ui:focus-ring-inset ui:[&>svg]:size-4.5",
        className,
      )}
      {...props}
    />
  );
}

/** The thin strip on the sidebar's edge that toggles it. */
function SidebarRail() {
  const { open, toggleSidebar } = useSidebar();
  const navy = useSidebarTone() === "navy";
  return (
    <button
      type="button"
      aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
      title="Toggle sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      className={cx(
        "ui:absolute ui:inset-y-0 ui:-right-2 ui:z-20 ui:w-4 ui:bg-transparent ui:transition-colors ui:after:absolute ui:after:inset-y-0 ui:after:left-1/2 ui:after:w-0.5",
        navy ? "ui:hover:after:bg-azure/60" : "ui:hover:after:bg-card-edge",
        open ? "ui:cursor-w-resize" : "ui:cursor-e-resize",
      )}
    />
  );
}

/** The button in the page header that opens or collapses the sidebar; on a phone the dock's does. */
export function SidebarTrigger({
  className,
  ...props
}: ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      type="button"
      aria-label="Toggle sidebar"
      onClick={toggleSidebar}
      className={cx(
        "ui:touch-target ui:inline-flex ui:size-8 ui:items-center ui:justify-center ui:rounded-md ui:text-muted ui:transition-colors ui:hover:bg-hairline ui:hover:text-body ui:focus-ring",
        className,
      )}
      {...props}
    >
      <PanelLeftIcon />
    </button>
  );
}

/** The page beside the sidebar. */
export function SidebarInset({ className, ...props }: ComponentProps<"main">) {
  return (
    <main
      className={cx(
        "ui:relative ui:flex ui:min-h-svh ui:min-w-0 ui:flex-1 ui:flex-col",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx("ui:flex ui:flex-col ui:gap-2 ui:p-2", className)}
      {...props}
    />
  );
}

/** The scrolling part under the header. */
export function SidebarContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx(
        "ui:flex ui:min-h-0 ui:flex-1 ui:flex-col ui:gap-2 ui:overflow-x-hidden ui:overflow-y-auto",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx(
        "ui:relative ui:flex ui:w-full ui:min-w-0 ui:flex-col ui:px-3 ui:py-1",
        className,
      )}
      {...props}
    />
  );
}

/** A small heading above a group's menu; gone while collapsed. */
export function SidebarGroupLabel({
  className,
  ...props
}: ComponentProps<"div">) {
  const collapsed = useSidebarCollapsed();
  const navy = useSidebarTone() === "navy";
  if (collapsed) return null;
  return (
    <div
      className={cx(
        "ui:flex ui:h-8 ui:shrink-0 ui:items-center ui:rounded-md ui:px-2.5",
        navy
          ? "ui:text-caps ui:font-semibold ui:text-azure-light/80"
          : "ui:text-xs ui:font-medium ui:text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarMenu({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      className={cx(
        "ui:flex ui:w-full ui:min-w-0 ui:flex-col ui:gap-1",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarMenuItem({ className, ...props }: ComponentProps<"li">) {
  return <li className={cx("ui:relative", className)} {...props} />;
}

/**
 * Rows that belong together, on a tint: on the rail, the pages of a
 * section laid out as icons of their own. A row of a `SidebarMenu`
 * holding its own list of `SidebarMenuItem`s, named by `label` for
 * assistive technology.
 */
export function SidebarMenuCluster({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const navy = useSidebarTone() === "navy";
  return (
    <li
      className={cx(
        "ui:-mx-0.5 ui:rounded-xl ui:p-0.5 ui:ring-1 ui:ring-inset",
        navy
          ? "ui:bg-white/10 ui:ring-white/10"
          : "ui:bg-shade ui:ring-card-edge",
      )}
    >
      <ul aria-label={label} className="ui:flex ui:flex-col ui:gap-0.5">
        {children}
      </ul>
    </li>
  );
}

/**
 * The pages of a section, open in place under its row: indented, on a
 * line down their left. A row of a `SidebarMenu` holding its own list of
 * `SidebarMenuItem`s, named by `label` for assistive technology.
 */
export function SidebarMenuSub({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const navy = useSidebarTone() === "navy";
  return (
    <li>
      <ul
        aria-label={label}
        className={cx(
          "ui:mt-1 ui:mb-1.5 ui:ml-4.5 ui:flex ui:flex-col ui:gap-0.5 ui:border-l ui:pl-2.5",
          navy ? "ui:border-white/15" : "ui:border-card-edge",
        )}
      >
        {children}
      </ul>
    </li>
  );
}

const MENU_BUTTON =
  "ui:flex ui:w-full ui:items-center ui:gap-2.5 ui:overflow-hidden ui:p-2 ui:text-left ui:text-sm ui:transition-colors ui:focus-ring-inset ui:disabled:pointer-events-none ui:disabled:opacity-50 ui:[&>svg]:size-4 ui:[&>svg]:shrink-0 ui:[&>span:last-child]:truncate";

/**
 * A row's look by the sidebar's tone: its shape, then its colours at
 * rest, as the page on screen, or as the section open under it. A row has
 * one set of colours at a time, so none overrides another.
 */
const MENU_TONES = {
  light: {
    shape: "ui:rounded-md",
    rest: "ui:hover:bg-hairline ui:hover:text-body",
    active:
      "ui:bg-accent ui:font-medium ui:text-accent-foreground ui:[&>svg]:text-brand",
    open: "ui:hover:bg-hairline ui:hover:text-body",
  },
  navy: {
    shape: "ui:rounded-control ui:font-medium ui:focus-ring-dark",
    rest: "ui:text-white/80 ui:hover:bg-white/14 ui:hover:text-white ui:[&>svg]:text-azure-light",
    active: "ui:bg-white ui:font-semibold ui:text-ink ui:[&>svg]:text-brand",
    open: "ui:bg-white/10 ui:text-white ui:hover:bg-white/14 ui:[&>svg]:text-azure-light",
  },
} as const;

/** On a touch screen, in the phone's panel, a row is 44px tall. */
const MENU_SIZES = {
  default: "ui:h-9 ui:pointer-coarse:h-11",
  /** A page under its section's row, opened in place. */
  sm: "ui:h-8 ui:pointer-coarse:h-11",
  /** Room for two lines beside a square: a logo and a subtitle, a user and an email. */
  lg: "ui:h-12",
} as const;

/**
 * One row of a menu: an icon and a label. Collapsed, only the icon shows
 * and the label becomes the tooltip. `asChild` styles the child element
 * (a `Link`) instead of rendering a button. A child handed over from a
 * server component must hold no server component of its own (an icon, say):
 * while the page streams, such a child can reach the row as a lazy
 * reference, and the row would render as a button on the server and as the
 * child in the browser. Make such a row in a client component instead.
 */
export function SidebarMenuButton({
  asChild = false,
  active = false,
  open = false,
  size = "default",
  tooltip,
  className,
  children,
  ...props
}: ComponentProps<"button"> & {
  asChild?: boolean;
  /** The page on screen. */
  active?: boolean;
  /** A section's row whose pages are open under it: lit softly. */
  open?: boolean;
  size?: keyof typeof MENU_SIZES;
  /** Shown on hover while collapsed; defaults to nothing. */
  tooltip?: string;
}) {
  const collapsed = useSidebarCollapsed();
  const tone = MENU_TONES[useSidebarTone()];
  const classes = cx(
    MENU_BUTTON,
    MENU_SIZES[size],
    tone.shape,
    active ? tone.active : open ? tone.open : tone.rest,
    // Collapsed, every row is a square: padded around a 1rem icon, or edge
    // to edge around a 2rem mark.
    collapsed &&
      (size === "lg" ? "ui:size-9! ui:p-0!" : "ui:size-9! ui:p-2.5!"),
    className,
  );
  const shared = {
    className: classes,
    "data-active": active || undefined,
    "aria-current": active ? ("page" as const) : undefined,
  };

  const row =
    asChild && isValidElement(children) ? (
      cloneElement(children as ReactElement<Record<string, unknown>>, shared)
    ) : (
      <button type="button" {...shared} {...props}>
        {children}
      </button>
    );
  // Collapsed to a rail, the row is an icon alone: its label shows beside it.
  return collapsed && tooltip ? (
    <Tooltip content={tooltip} side="right">
      {row}
    </Tooltip>
  ) : (
    row
  );
}

/**
 * The text beside an icon. Collapsed it is hidden, so the row is a square,
 * but still read out: it names the icon's link.
 */
export function SidebarLabel({ className, ...props }: ComponentProps<"span">) {
  const collapsed = useSidebarCollapsed();
  return (
    <span
      className={cx(collapsed ? "ui:sr-only" : "ui:truncate", className)}
      {...props}
    />
  );
}
