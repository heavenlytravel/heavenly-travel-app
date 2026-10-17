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
import { PanelLeftIcon, PanelRightIcon, XIcon } from "./icons.js";
import { Sheet } from "./sheet.js";

/**
 * An app sidebar that collapses to a rail of icons, after shadcn's sidebar:
 * a provider owns the open state, a keyboard shortcut (Ctrl or Cmd + B)
 * and a rail toggle it, the state survives reloads in a cookie, and below
 * `md` the same content opens in a sheet instead. Composed from small
 * pieces so each app decides what goes in the header, the groups and the
 * footer.
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

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar needs a SidebarProvider.");
  return context;
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
      if ((event.metaKey || event.ctrlKey) && event.key === "b") {
        event.preventDefault();
        toggleSidebar();
      }
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
 * wide open and 3rem collapsed; below that it is a sheet from the left,
 * always drawn open.
 */
export function Sidebar({
  title,
  children,
}: {
  /** The sheet's accessible name: "Console menu". */
  title: string;
  children: ReactNode;
}) {
  const { open, openMobile, setOpenMobile } = useSidebar();

  return (
    <>
      <aside
        data-state={open ? "expanded" : "collapsed"}
        className={cx(
          "ui:sticky ui:top-0 ui:hidden ui:h-svh ui:shrink-0 ui:flex-col ui:border-r ui:border-neutral-200 ui:bg-white ui:text-neutral-900 ui:transition-[width] ui:duration-200 ui:ease-linear ui:md:flex",
          open ? "ui:w-64" : "ui:w-12",
        )}
      >
        <CollapsedContext.Provider value={!open}>
          {children}
        </CollapsedContext.Provider>
        <SidebarRail />
      </aside>
      {/* No display class on the dialog itself: closed, it must stay hidden. */}
      <Sheet
        open={openMobile}
        onOpenChange={setOpenMobile}
        side="left"
        title={title}
        className="ui:text-neutral-900"
      >
        <div className="ui:flex ui:min-h-full ui:flex-col">
          <div className="ui:flex ui:h-12 ui:shrink-0 ui:items-center ui:justify-end ui:px-2">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpenMobile(false)}
              className="ui:inline-flex ui:size-8 ui:items-center ui:justify-center ui:rounded-md ui:text-neutral-500 ui:hover:bg-neutral-100 ui:hover:text-neutral-900"
            >
              <XIcon />
            </button>
          </div>
          <CollapsedContext.Provider value={false}>
            {children}
          </CollapsedContext.Provider>
        </div>
      </Sheet>
    </>
  );
}

/** From here up the panel is a column; below, it opens in a sheet. */
const PANEL_DESKTOP = "(min-width: 80rem)";

/** The panel's own cookie, apart from the sidebar's: the two collapse independently. */
const PANEL_COOKIE_NAME = "panel_state";

type SidebarPanelContextValue = {
  /** The sheet, on narrow screens. */
  open: boolean;
  setOpen: (open: boolean) => void;
  /** The column, from `xl` up: a rail of icons when collapsed. */
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
};

const SidebarPanelContext = createContext<SidebarPanelContextValue | null>(
  null,
);

export function useSidebarPanel() {
  const context = useContext(SidebarPanelContext);
  if (!context)
    throw new Error("useSidebarPanel needs a SidebarPanelProvider.");
  return context;
}

/**
 * Owns the panel's two states: whether its sheet is open on narrow
 * screens, so the trigger in the page's header and the panel further down
 * share it, and whether its column is collapsed to a rail from `xl` up,
 * kept in its own cookie apart from the sidebar's. Widening the window
 * past `xl` closes the sheet: the column is on screen from there.
 */
export function SidebarPanelProvider({
  defaultCollapsed = false,
  children,
}: {
  /** Read from the `panel_state` cookie on the server, so there is no flash. */
  defaultCollapsed?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsedState] = useState(defaultCollapsed);

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next);
    document.cookie = `${PANEL_COOKIE_NAME}=${next ? "collapsed" : "expanded"}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((current) => {
      const next = !current;
      document.cookie = `${PANEL_COOKIE_NAME}=${next ? "collapsed" : "expanded"}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
      return next;
    });
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia(PANEL_DESKTOP);
    const onChange = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  const value = useMemo(
    () => ({ open, setOpen, collapsed, setCollapsed, toggleCollapsed }),
    [open, collapsed, setCollapsed, toggleCollapsed],
  );
  return (
    <SidebarPanelContext.Provider value={value}>
      {children}
    </SidebarPanelContext.Provider>
  );
}

/**
 * The button inside the panel that collapses its column to a rail or
 * opens it again; only where the column shows, from `xl` up.
 */
export function SidebarPanelToggle({
  className,
  ...props
}: ComponentProps<"button">) {
  const { collapsed, toggleCollapsed } = useSidebarPanel();
  return (
    <button
      type="button"
      aria-label={collapsed ? "Expand panel" : "Collapse panel"}
      title={collapsed ? "Expand panel" : "Collapse panel"}
      aria-expanded={!collapsed}
      onClick={toggleCollapsed}
      className={cx(
        "ui:hidden ui:size-8 ui:shrink-0 ui:items-center ui:justify-center ui:rounded-md ui:text-neutral-500 ui:transition-colors ui:hover:bg-neutral-100 ui:hover:text-neutral-900 ui:focus-visible:outline-2 ui:focus-visible:outline-offset-2 ui:focus-visible:outline-neutral-900 ui:xl:inline-flex",
        className,
      )}
      {...props}
    >
      <PanelRightIcon />
    </button>
  );
}

/** The thin strip on the panel's edge that collapses or expands it, like the sidebar's rail. */
function SidebarPanelRail() {
  const { collapsed, toggleCollapsed } = useSidebarPanel();
  return (
    <button
      type="button"
      aria-label={collapsed ? "Expand panel" : "Collapse panel"}
      title="Toggle panel"
      tabIndex={-1}
      onClick={toggleCollapsed}
      className={cx(
        "ui:absolute ui:inset-y-0 ui:-left-2 ui:z-20 ui:w-4 ui:bg-transparent ui:transition-colors ui:after:absolute ui:after:inset-y-0 ui:after:left-1/2 ui:after:w-0.5 ui:hover:after:bg-neutral-200",
        collapsed ? "ui:cursor-w-resize" : "ui:cursor-e-resize",
      )}
    />
  );
}

/** The button that opens the panel's sheet; gone from `xl` up, where the column shows. */
export function SidebarPanelTrigger({
  className,
  ...props
}: ComponentProps<"button">) {
  const { open, setOpen } = useSidebarPanel();
  return (
    <button
      type="button"
      aria-label="Toggle panel"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={cx(
        "ui:inline-flex ui:size-8 ui:items-center ui:justify-center ui:rounded-md ui:text-neutral-600 ui:transition-colors ui:hover:bg-neutral-100 ui:hover:text-neutral-900 ui:focus-visible:outline-2 ui:focus-visible:outline-offset-2 ui:focus-visible:outline-neutral-900 ui:xl:hidden",
        className,
      )}
      {...props}
    >
      <PanelRightIcon />
    </button>
  );
}

/**
 * A second column on the page's other side, after shadcn's sidebar-15
 * right sidebar: a sticky panel for the detail of the record on screen,
 * built from the same header, content and footer pieces as the sidebar.
 * From `xl` up it is a column, 20rem wide open and 3rem collapsed to a
 * rail of icons by its toggle or its edge, on its own apart from the
 * sidebar; below `xl`, inside a `SidebarPanelProvider`, the same content
 * opens in a sheet from the right when the trigger is pressed, always
 * drawn open. The caller says where the column sticks, since that depends
 * on the page's header.
 */
export function SidebarPanel({
  title,
  className,
  children,
  ...props
}: ComponentProps<"aside"> & {
  /** The column's and the sheet's accessible name: "Location panel". */
  title: string;
}) {
  const panel = useContext(SidebarPanelContext);
  const collapsed = panel?.collapsed ?? false;

  return (
    <>
      <aside
        aria-label={title}
        data-state={collapsed ? "collapsed" : "expanded"}
        className={cx(
          "ui:sticky ui:hidden ui:shrink-0 ui:flex-col ui:border-l ui:border-neutral-200 ui:bg-white ui:text-neutral-900 ui:transition-[width] ui:duration-200 ui:ease-linear ui:xl:flex",
          collapsed ? "ui:w-12" : "ui:w-80",
          className,
        )}
        {...props}
      >
        <CollapsedContext.Provider value={collapsed}>
          {children}
        </CollapsedContext.Provider>
        {panel ? <SidebarPanelRail /> : null}
      </aside>
      {panel ? (
        <Sheet
          open={panel.open}
          onOpenChange={panel.setOpen}
          side="right"
          title={title}
          className="ui:text-neutral-900"
        >
          <div className="ui:flex ui:min-h-full ui:flex-col">
            <div className="ui:flex ui:h-12 ui:shrink-0 ui:items-center ui:justify-end ui:px-2">
              <button
                type="button"
                aria-label="Close panel"
                onClick={() => panel.setOpen(false)}
                className="ui:inline-flex ui:size-8 ui:items-center ui:justify-center ui:rounded-md ui:text-neutral-500 ui:hover:bg-neutral-100 ui:hover:text-neutral-900"
              >
                <XIcon />
              </button>
            </div>
            <CollapsedContext.Provider value={false}>
              {children}
            </CollapsedContext.Provider>
          </div>
        </Sheet>
      ) : null}
    </>
  );
}

/** The thin strip on the sidebar's edge that toggles it. */
function SidebarRail() {
  const { open, toggleSidebar } = useSidebar();
  return (
    <button
      type="button"
      aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
      title="Toggle sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      className={cx(
        "ui:absolute ui:inset-y-0 ui:-right-2 ui:z-20 ui:w-4 ui:bg-transparent ui:transition-colors ui:after:absolute ui:after:inset-y-0 ui:after:left-1/2 ui:after:w-0.5 ui:hover:after:bg-neutral-200",
        open ? "ui:cursor-w-resize" : "ui:cursor-e-resize",
      )}
    />
  );
}

/** The button in the page header that opens or collapses the sidebar. */
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
        "ui:inline-flex ui:size-8 ui:items-center ui:justify-center ui:rounded-md ui:text-neutral-600 ui:transition-colors ui:hover:bg-neutral-100 ui:hover:text-neutral-900 ui:focus-visible:outline-2 ui:focus-visible:outline-offset-2 ui:focus-visible:outline-neutral-900",
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

export function SidebarFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx("ui:flex ui:flex-col ui:gap-2 ui:p-2", className)}
      {...props}
    />
  );
}

/** The scrolling middle, between header and footer. */
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
        "ui:relative ui:flex ui:w-full ui:min-w-0 ui:flex-col ui:p-2",
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
  if (collapsed) return null;
  return (
    <div
      className={cx(
        "ui:flex ui:h-8 ui:shrink-0 ui:items-center ui:rounded-md ui:px-2 ui:text-xs ui:font-medium ui:text-neutral-500",
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

const MENU_BUTTON =
  "ui:flex ui:w-full ui:items-center ui:gap-2 ui:overflow-hidden ui:rounded-md ui:p-2 ui:text-left ui:text-sm ui:outline-hidden ui:transition-colors ui:hover:bg-neutral-100 ui:hover:text-neutral-900 ui:focus-visible:ring-2 ui:focus-visible:ring-neutral-900 ui:disabled:pointer-events-none ui:disabled:opacity-50 ui:[&>svg]:size-4 ui:[&>svg]:shrink-0 ui:[&>span:last-child]:truncate";

const MENU_SIZES = {
  default: "ui:h-8",
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
  size = "default",
  tooltip,
  className,
  children,
  ...props
}: ComponentProps<"button"> & {
  asChild?: boolean;
  active?: boolean;
  size?: keyof typeof MENU_SIZES;
  /** Shown on hover while collapsed; defaults to nothing. */
  tooltip?: string;
}) {
  const collapsed = useSidebarCollapsed();
  const classes = cx(
    MENU_BUTTON,
    MENU_SIZES[size],
    active &&
      "ui:bg-neutral-900 ui:text-white ui:hover:bg-neutral-900 ui:hover:text-white",
    // Collapsed, every row is a square: padded around a 1rem icon, or edge
    // to edge around a 2rem mark.
    collapsed && (size === "lg" ? "ui:size-8! ui:p-0!" : "ui:size-8! ui:p-2!"),
    className,
  );
  const shared = {
    className: classes,
    title: collapsed ? tooltip : undefined,
    "data-active": active || undefined,
    "aria-current": active ? ("page" as const) : undefined,
  };

  if (asChild && isValidElement(children)) {
    return cloneElement(
      children as ReactElement<Record<string, unknown>>,
      shared,
    );
  }
  return (
    <button type="button" {...shared} {...props}>
      {children}
    </button>
  );
}

/** The text beside an icon; hidden while collapsed so the row is a square. */
export function SidebarLabel({ className, ...props }: ComponentProps<"span">) {
  const collapsed = useSidebarCollapsed();
  if (collapsed) return null;
  return <span className={cx("ui:truncate", className)} {...props} />;
}

export function SidebarSeparator({
  className,
  ...props
}: ComponentProps<"hr">) {
  return (
    <hr
      className={cx(
        "ui:mx-2 ui:border-0 ui:border-t ui:border-neutral-200",
        className,
      )}
      {...props}
    />
  );
}
