"use client";

import { Command } from "cmdk";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { cx } from "./cx.js";
import { SearchIcon, SpinnerIcon } from "./icons.js";
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

/**
 * The button in a bar that opens the palette: a box that reads like a
 * search field with its keys at the end from `sm` up, the search icon
 * alone on a phone.
 */
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
        "ui:inline-flex ui:h-9 ui:shrink-0 ui:items-center ui:gap-2 ui:rounded-md ui:text-sm ui:text-slate-500 ui:outline-hidden ui:transition-colors ui:focus-visible:ring-2 ui:focus-visible:ring-ring",
        "ui:max-sm:size-8 ui:max-sm:justify-center ui:max-sm:text-slate-600 ui:max-sm:hover:bg-slate-100 ui:max-sm:hover:text-slate-900",
        "ui:sm:w-full ui:sm:border ui:sm:border-line ui:sm:bg-white ui:sm:px-3 ui:sm:hover:border-slate-400",
        className,
      )}
    >
      <SearchIcon className="ui:sm:text-slate-400" />
      <span className="ui:hidden ui:flex-1 ui:text-left ui:sm:inline">
        {label}…
      </span>
      <kbd
        aria-hidden="true"
        className="ui:hidden ui:rounded ui:border ui:border-slate-200 ui:bg-white ui:px-1.5 ui:font-sans ui:text-[11px] ui:text-slate-500 ui:sm:block"
      >
        {shortcut}
      </kbd>
    </button>
  );
}

/**
 * A command palette over a dimmed page, after shadcn's (cmdk inside a
 * dialog): a box on top and, under it, the rows that match in groups under
 * their headings. The arrows walk the rows across the groups, Enter or a
 * click chooses one, Escape closes. Ctrl or Cmd + K opens it from anywhere
 * on the page, and again closes it. The caller owns the text and the rows,
 * and filters them itself; `pending` says a search is on its way, shown
 * as a spinner once it takes a moment, and `status` is a line under the
 * rows: "Searching…", "No results". Built on the native `<dialog>`, as the
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
}) {
  const ref = useModal(open);
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
        // The dialog element itself is only hit through the backdrop.
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
      className="ui:mx-auto ui:mt-[12dvh] ui:max-h-none ui:w-[min(36rem,calc(100vw-1rem))] ui:overflow-hidden ui:rounded-xl ui:border ui:border-slate-200 ui:bg-white ui:p-0 ui:text-inherit ui:shadow-[0_22px_55px_rgba(0,38,75,0.22)] ui:backdrop:bg-ink/45"
    >
      {open ? (
        <Command
          label={label}
          shouldFilter={false}
          loop
          value={current}
          onValueChange={setMarked}
        >
          <div className="ui:flex ui:items-center ui:gap-2 ui:border-b ui:border-slate-200 ui:px-3">
            <SearchIcon className="ui:text-slate-400" />
            <Command.Input
              value={value}
              onValueChange={onValueChange}
              placeholder={placeholder}
              className="ui:h-12 ui:min-w-0 ui:flex-1 ui:bg-transparent ui:text-sm ui:outline-hidden ui:placeholder:text-slate-400"
            />
            {searching ? (
              <SpinnerIcon
                aria-label="Searching"
                className="ui:text-slate-400"
              />
            ) : null}
          </div>
          <ModalBody open={open} className="ui:max-h-[min(24rem,60dvh)]">
            <Command.List className="ui:scroll-py-1 ui:p-1">
              {groups.map((group) => (
                <Command.Group
                  key={group.key}
                  heading={group.heading}
                  className="ui:[&_[cmdk-group-heading]]:px-2 ui:[&_[cmdk-group-heading]]:pt-2 ui:[&_[cmdk-group-heading]]:pb-1 ui:[&_[cmdk-group-heading]]:text-xs ui:[&_[cmdk-group-heading]]:font-medium ui:[&_[cmdk-group-heading]]:text-slate-500"
                >
                  {group.items.map((item) => (
                    <Command.Item
                      key={item.key}
                      value={item.key}
                      onSelect={() => onChoose(item.value)}
                      className="ui:flex ui:cursor-pointer ui:items-center ui:gap-2 ui:rounded-sm ui:px-2 ui:py-1.5 ui:text-sm ui:outline-hidden ui:select-none ui:data-[selected=true]:bg-accent ui:data-[selected=true]:text-accent-foreground ui:[&>svg]:size-4 ui:[&>svg]:shrink-0 ui:[&>svg]:text-slate-500"
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
    </dialog>
  );
}
