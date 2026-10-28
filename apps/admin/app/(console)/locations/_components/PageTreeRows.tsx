"use client";

import { cx } from "@repo/ui/cx";
import { ChevronRightIcon } from "@repo/ui/icons";
import { Tooltip } from "@repo/ui/tooltip";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

/**
 * What answers the admin in a list of pages drawn on the server: a
 * section's pages folding away under its row, and a row that opens its
 * page wherever it is pressed, as the name in it does. See
 * docs/261025-marketing-pages.md, "The console's Pages".
 */

/**
 * The sections folded away, by key, while the console stays open in the
 * tab: back from an editor, the list is as it was left. Written on a press
 * alone, so the server, which never sees one, draws every section open.
 */
const folded = new Set<string>();

const FoldsContext = createContext<{
  /** The list's sections that fold, by key. */
  ids: readonly string[];
  closed: ReadonlySet<string>;
  fold: (ids: readonly string[], shut: boolean) => void;
} | null>(null);

/**
 * Which of a list's sections are folded, for its rows and the chevron in
 * its heading that folds or opens them all. `ids` are the keys of the sections that fold.
 */
export function PageTreeFolds({
  ids,
  children,
}: {
  ids: readonly string[];
  children: ReactNode;
}) {
  const [closed, setClosed] = useState<ReadonlySet<string>>(
    () => new Set(ids.filter((id) => folded.has(id))),
  );
  function fold(which: readonly string[], shut: boolean) {
    const next = new Set(closed);
    for (const id of which) {
      if (shut) {
        folded.add(id);
        next.add(id);
      } else {
        folded.delete(id);
        next.delete(id);
      }
    }
    setClosed(next);
  }
  return (
    <FoldsContext.Provider value={{ ids, closed, fold }}>
      {children}
    </FoldsContext.Provider>
  );
}

/**
 * The chevron in the Page heading, over the rows' own, as a box that ticks
 * them all: turned down while any section is open, it folds every one;
 * once all are folded, it opens them again. A list with no section that
 * folds keeps its place empty.
 */
export function FoldAllToggle() {
  const folds = useContext(FoldsContext);
  if (!folds || folds.ids.length === 0) {
    return <span aria-hidden="true" className="size-6 shrink-0" />;
  }
  const anyOpen = folds.ids.some((id) => !folds.closed.has(id));
  const label = anyOpen ? "Collapse all" : "Expand all";
  return (
    <Tooltip content={label}>
      <FoldChevron
        open={anyOpen}
        label={label}
        onClick={() => folds.fold(folds.ids, anyOpen)}
      />
    </Tooltip>
  );
}

const GroupContext = createContext<{
  open: boolean;
  toggle: () => void;
} | null>(null);

/** A section's rows: its own, and while it is open, the pages under it. */
export function PageGroupRows({
  id,
  children,
}: {
  /** The section's key in the list, which keeps it folded. */
  id: string;
  children: ReactNode;
}) {
  const folds = useContext(FoldsContext);
  const open = !folds?.closed.has(id);
  function toggle() {
    folds?.fold([id], open);
  }
  return (
    <GroupContext.Provider value={{ open, toggle }}>
      {children}
    </GroupContext.Provider>
  );
}

/** The fold on a section's row: a chevron, turned down while the pages under it show. */
export function PageGroupToggle({ label }: { label: string }) {
  const group = useContext(GroupContext);
  if (!group) return null;
  return (
    <FoldChevron
      open={group.open}
      label={`${group.open ? "Hide" : "Show"} the pages under ${label}`}
      onClick={group.toggle}
    />
  );
}

/** A fold's button: a chevron pointing right, turned down while open. */
function FoldChevron({
  open,
  label,
  onClick,
}: {
  open: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={label}
      onClick={onClick}
      className="flex size-6 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-brand"
    >
      <ChevronRightIcon
        className={cx(
          "size-4 transition-transform motion-reduce:transition-none",
          open && "rotate-90",
        )}
      />
    </button>
  );
}

/** The pages under a section, while it is open. */
export function PageGroupChildren({ children }: { children: ReactNode }) {
  const group = useContext(GroupContext);
  return group?.open === false ? null : children;
}

/**
 * A row that opens `href` wherever it is pressed: what its name links to.
 * Its own links, buttons and dialogs keep their presses, and so does a
 * press that selects text; Ctrl or ⌘ opens it in a new tab, as the link
 * would.
 */
export function PageRowLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  function open(event: MouseEvent<HTMLTableRowElement>) {
    const target = event.target;
    // A press in a dialog drawn on the body arrives here too, through React.
    if (!(target instanceof Element) || !event.currentTarget.contains(target)) {
      return;
    }
    if (target.closest("a, button, input, select, textarea, label, dialog")) {
      return;
    }
    if (window.getSelection()?.toString()) return;
    if (event.ctrlKey || event.metaKey) {
      window.open(href, "_blank", "noopener");
      return;
    }
    router.push(href);
  }
  return (
    <tr
      onClick={open}
      className={cx("cursor-pointer hover:bg-slate-50", className)}
    >
      {children}
    </tr>
  );
}
