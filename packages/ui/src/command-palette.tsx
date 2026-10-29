"use client";

import { Command } from "cmdk";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { cx } from "./cx.js";
import { SearchIcon, SpinnerIcon, XIcon } from "./icons.js";
import { ModalBody, onModalClose, useModal } from "./modal.js";

/** One row of the palette: what it shows, and the value `onChoose` is handed. */
export type CommandPaletteItem = {
  key: string;
  value: string;
  content: ReactNode;
};

/** A group of rows under its heading: "Pages", "Bookings". */
export type CommandPaletteGroup = {
  key: string;
  heading: string;
  items: readonly CommandPaletteItem[];
};

/** How long a search may take before the palette says it is searching, so a quick one does not flicker. */
const SPINNER_DELAY_MS = 150;

const noSubscribe = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

/** The keys that open the palette, as this device names them: ⌘ K on a Mac, Ctrl K elsewhere. */
export function useShortcutLabel() {
  return useSyncExternalStore(noSubscribe, isMac, () => false)
    ? "⌘ K"
    : "Ctrl K";
}

/** The button in a bar that opens the palette: a box that reads like a search field, with its keys at the end. */
export function CommandPaletteTrigger({
  label,
  onOpen,
  className,
}: {
  /** What the palette finds: "Search". */
  label: string;
  onOpen: () => void;
  className?: string;
}) {
  const shortcut = useShortcutLabel();
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      aria-keyshortcuts="Control+K Meta+K"
      className={cx(
        "ui:inline-flex ui:h-10 ui:w-full ui:shrink-0 ui:items-center ui:gap-2 ui:rounded-[9px] ui:border ui:border-line ui:bg-white ui:px-3 ui:text-sm ui:text-slate-500 ui:shadow-[0_1px_3px_rgba(0,38,75,0.08)] ui:outline-hidden ui:transition-colors ui:hover:border-slate-400 ui:focus-visible:ring-2 ui:focus-visible:ring-ring",
        className,
      )}
    >
      <SearchIcon className="ui:text-slate-400" />
      <span className="ui:flex-1 ui:text-left">{label}…</span>
      <Keys>{shortcut}</Keys>
    </button>
  );
}

/** Keys to press, as a key cap: "Ctrl K", "Esc". */
function Keys({ children }: { children: ReactNode }) {
  return (
    <kbd
      aria-hidden="true"
      className="ui:rounded ui:border ui:border-slate-200 ui:bg-white ui:px-1.5 ui:font-sans ui:text-[11px] ui:text-slate-500"
    >
      {children}
    </kbd>
  );
}

/**
 * A command palette over a dimmed page, after shadcn's (cmdk inside a
 * dialog): a box on top, its text ready to type, and under it the rows
 * that match in groups under their headings. The arrows walk the rows
 * across the groups, Enter or a click chooses one, Escape closes, as the
 * Esc at the box's end says; on a phone, with no Escape, the `dock`
 * closes it, or a close button there. Ctrl or Cmd + K opens it from
 * anywhere on the page, and again closes it. The caller owns the text and
 * the rows, and filters them itself; `pending` says a search is on its way, shown as a spinner once
 * it takes a moment, and `status` is a line under the rows: "Searching…",
 * "No results". From `md` up it is a box high on the page; on a phone it
 * takes the room the sidebar's panel does. It fades in and rises a little
 * (`.ui-pop` in styles.css). Built on the native `<dialog>`, as the
 * dialog and the sheet are.
 */
export function CommandPalette({
  label,
  placeholder,
  open,
  onOpenChange,
  value,
  onValueChange,
  groups,
  pending = false,
  status,
  onChoose,
  dock,
}: {
  /** The palette's name for screen readers: "Search the console". */
  label: string;
  placeholder: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
  groups: readonly CommandPaletteGroup[];
  pending?: boolean;
  status?: ReactNode;
  onChoose: (value: string) => void;
  /**
   * The bar floating at a phone's foot that opened it, drawn over it too,
   * holding the way to close it there (`SidebarDock`). Without one a
   * phone has a close button at the box's end.
   */
  dock?: ReactNode;
}) {
  const ref = useModal(open);
  const input = useRef<HTMLInputElement>(null);
  const [slow, setSlow] = useState(false);
  // The row marked: the first again as the text changes, and the first
  // when the rows change under it, so Enter always has a row to open.
  const [marked, setMarked] = useState("");
  const [markedFor, setMarkedFor] = useState(value);
  if (value !== markedFor) {
    setMarkedFor(value);
    setMarked("");
  }
  const keys = groups.flatMap((group) => group.items.map((item) => item.key));
  const current = keys.includes(marked) ? marked : (keys[0] ?? "");

  // Once it is shown (`useModal`'s effect runs first), the box takes the
  // keys, not cmdk's list, which the dialog would focus first.
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setSlow(true), SPINNER_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [pending]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const searching = pending && slow;

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onModalClose(() => onOpenChange(false))}
      onClick={(event) => {
        // The dialog itself, clear around the panel, is the page's dimmed margin.
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
      className="ui-pop ui:fixed ui:inset-0 ui:m-0 ui:size-full ui:max-h-none ui:max-w-none ui:bg-transparent ui:p-0 ui:text-inherit ui:backdrop:bg-ink/45"
    >
      {open ? (
        <Command
          label={label}
          shouldFilter={false}
          loop
          value={current}
          onValueChange={setMarked}
          className="ui-pop-panel ui:absolute ui:inset-2 ui:flex ui:flex-col ui:overflow-hidden ui:rounded-2xl ui:border ui:border-slate-200 ui:bg-white ui:shadow-[0_22px_55px_rgba(0,38,75,0.22)] ui:md:inset-x-0 ui:md:top-[12dvh] ui:md:bottom-auto ui:md:mx-auto ui:md:w-[38rem] ui:md:rounded-[14px]"
        >
          <div className="ui:flex ui:shrink-0 ui:items-center ui:gap-2 ui:border-b ui:border-slate-200 ui:pr-2 ui:pl-3">
            <SearchIcon className="ui:text-slate-400" />
            <Command.Input
              value={value}
              onValueChange={onValueChange}
              placeholder={placeholder}
              ref={input}
              className="ui:h-12 ui:min-w-0 ui:flex-1 ui:bg-transparent ui:text-sm ui:outline-hidden ui:placeholder:text-slate-400"
            />
            {searching ? (
              <SpinnerIcon
                aria-label="Searching"
                className="ui:text-slate-400"
              />
            ) : null}
            <button
              type="button"
              aria-label="Close"
              aria-keyshortcuts="Escape"
              onClick={() => onOpenChange(false)}
              className={cx(
                dock ? "ui:max-md:hidden" : null,
                "ui:inline-flex ui:h-8 ui:min-w-8 ui:items-center ui:justify-center ui:rounded-md ui:text-slate-500 ui:outline-hidden ui:hover:bg-slate-100 ui:hover:text-slate-900 ui:focus-visible:ring-2 ui:focus-visible:ring-ring",
              )}
            >
              <span className="ui:max-md:hidden">
                <Keys>Esc</Keys>
              </span>
              <XIcon className="ui:md:hidden" />
            </button>
          </div>
          <ModalBody
            open={open}
            className={cx(
              "ui:min-h-0 ui:flex-1 ui:md:max-h-[min(24rem,60dvh)]",
              // Room at the foot for the dock, so the last row scrolls clear of it.
              dock ? "ui:max-md:pb-20" : null,
            )}
          >
            <Command.List className="ui:scroll-py-1 ui:p-1">
              {groups.map((group) => (
                <Command.Group
                  key={group.key}
                  heading={group.heading}
                  className="ui:[&_[cmdk-group-heading]]:px-2 ui:[&_[cmdk-group-heading]]:pt-2 ui:[&_[cmdk-group-heading]]:pb-1 ui:[&_[cmdk-group-heading]]:text-[11px] ui:[&_[cmdk-group-heading]]:font-semibold ui:[&_[cmdk-group-heading]]:tracking-[0.06em] ui:[&_[cmdk-group-heading]]:text-slate-500 ui:[&_[cmdk-group-heading]]:uppercase"
                >
                  {group.items.map((item) => (
                    <Command.Item
                      key={item.key}
                      value={item.key}
                      onSelect={() => onChoose(item.value)}
                      className="ui:flex ui:cursor-pointer ui:items-center ui:gap-2 ui:rounded-lg ui:px-2.5 ui:py-2 ui:text-sm ui:outline-hidden ui:select-none ui:data-[selected=true]:bg-accent ui:data-[selected=true]:text-accent-foreground ui:[&>svg]:size-4 ui:[&>svg]:shrink-0 ui:[&>svg]:text-slate-500"
                    >
                      {item.content}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>
            {searching || status ? (
              <p className="ui:px-3 ui:py-3 ui:text-sm ui:text-slate-500">
                {searching ? "Searching…" : status}
              </p>
            ) : null}
          </ModalBody>
        </Command>
      ) : null}
      {dock}
    </dialog>
  );
}
