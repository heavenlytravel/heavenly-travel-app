"use client";

import { Popover } from "radix-ui";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { cx } from "./cx.js";
import { inputClassName } from "./field.js";
import { SearchIcon } from "./icons.js";

/** One row under the box: what it shows, and the key `onChoose` is handed. */
export type SearchMenuOption = { key: string; content: ReactNode };

const noSubscribe = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * A search box whose matches open under it as the text is typed, for
 * finding one record from anywhere: the arrows walk the rows, Enter opens
 * the one marked, Escape closes the list and a second Escape clears the
 * box. Ctrl or Cmd + K puts the cursor in it from anywhere on the page,
 * and the box says so. The caller owns the text and the rows, and says
 * in `status` what the list holds when it has no rows of its own to show:
 * "Searching…", "Nothing matches". The list opens only with text in the
 * box. On a phone the box is a button with the search icon until it is
 * pressed; then it lies across the bar it sits in (its nearest positioned
 * ancestor) until it is left empty. The caller's `className` sizes the
 * box from `sm` up.
 */
export function SearchMenu({
  label,
  placeholder,
  value,
  onValueChange,
  options,
  status,
  pending = false,
  onChoose,
  className,
}: {
  /** What the box searches, for screen readers: "Find a booking". */
  label: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SearchMenuOption[];
  /** A line under the rows; none for none. */
  status?: ReactNode;
  /** A search is on its way: the icon pulses. */
  pending?: boolean;
  onChoose: (key: string) => void;
  /** On the box's wrapper from `sm` up: its width, say. */
  className?: string;
}) {
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const mac = useSyncExternalStore(noSubscribe, isMac, () => false);
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  // On a phone: the box is out, across the bar.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (expanded) input.current?.focus();
  }, [expanded]);
  const [active, setActive] = useState(0);
  // New rows mark the first again.
  const [shownOptions, setShownOptions] = useState(options);
  if (options !== shownOptions) {
    setShownOptions(options);
    setActive(0);
  }
  const shown = open && value.trim() !== "" && (options.length > 0 || !!status);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setExpanded(true);
        input.current?.focus();
        input.current?.select();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function choose(key: string) {
    setOpen(false);
    setExpanded(false);
    input.current?.blur();
    onChoose(key);
  }

  const step = (by: number) => {
    setOpen(true);
    if (options.length > 0) {
      setActive((at) => (at + by + options.length) % options.length);
    }
  };

  return (
    <Popover.Root open={shown} onOpenChange={setOpen}>
      {expanded ? null : (
        <button
          type="button"
          aria-label={label}
          onClick={() => setExpanded(true)}
          className="ui:inline-flex ui:size-8 ui:shrink-0 ui:items-center ui:justify-center ui:rounded-md ui:text-slate-600 ui:transition-colors ui:hover:bg-slate-100 ui:hover:text-slate-900 ui:sm:hidden"
        >
          <SearchIcon />
        </button>
      )}
      <Popover.Anchor asChild>
        <div
          ref={anchor}
          role="search"
          className={cx(
            expanded
              ? "ui:max-sm:absolute ui:max-sm:inset-0 ui:max-sm:z-20 ui:max-sm:flex ui:max-sm:items-center ui:max-sm:bg-white ui:max-sm:px-3"
              : "ui:max-sm:hidden",
            className,
          )}
        >
          <div className="ui:relative ui:w-full">
            <SearchIcon
              className={cx(
                "ui:pointer-events-none ui:absolute ui:top-1/2 ui:left-3 ui:-translate-y-1/2",
                pending
                  ? "ui:animate-pulse ui:text-slate-700"
                  : "ui:text-slate-400",
              )}
            />
            <input
              ref={input}
              type="search"
              role="combobox"
              aria-label={label}
              aria-expanded={shown}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                shown && options[active] ? `${listId}-${active}` : undefined
              }
              placeholder={placeholder}
              value={value}
              onFocus={() => {
                setFocused(true);
                setOpen(true);
              }}
              onBlur={() => {
                setFocused(false);
                if (value.trim() === "") setExpanded(false);
              }}
              onChange={(event) => {
                onValueChange(event.target.value);
                setOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  step(1);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  step(-1);
                } else if (event.key === "Enter") {
                  const option = shown ? options[active] : undefined;
                  if (option) {
                    event.preventDefault();
                    choose(option.key);
                  }
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  if (shown) setOpen(false);
                  else onValueChange("");
                }
              }}
              className={cx(
                inputClassName,
                "ui:h-9! ui:pr-16 ui:pl-9 ui:[&::-webkit-search-cancel-button]:hidden",
              )}
            />
            {focused || value ? null : (
              <kbd
                aria-hidden="true"
                className="ui:pointer-events-none ui:absolute ui:top-1/2 ui:right-2.5 ui:hidden ui:-translate-y-1/2 ui:rounded ui:border ui:border-slate-200 ui:bg-white ui:px-1.5 ui:font-sans ui:text-[11px] ui:text-slate-500 ui:sm:block"
              >
                {mac ? "⌘ K" : "Ctrl K"}
              </kbd>
            )}
          </div>
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={8}
          // The cursor stays in the box; the list follows it.
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            if (anchor.current?.contains(event.target as Node)) {
              event.preventDefault();
            }
          }}
          className="ui:z-50 ui:w-[max(var(--radix-popover-trigger-width),24rem)] ui:max-w-[calc(100vw-1rem)] ui:overflow-hidden ui:rounded-popover ui:border ui:border-popover-line ui:bg-popover ui:p-1 ui:text-popover-foreground ui:shadow-lg"
        >
          <div id={listId} role="listbox" aria-label={label}>
            {options.map((option, index) => (
              <div
                key={option.key}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseMove={() => setActive(index)}
                // The press keeps the cursor in the box; the click chooses.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option.key)}
                className="ui:cursor-pointer ui:rounded-sm ui:px-2 ui:py-1.5 ui:text-sm ui:aria-selected:bg-accent ui:aria-selected:text-accent-foreground"
              >
                {option.content}
              </div>
            ))}
          </div>
          {status ? (
            <p className="ui:px-2 ui:py-1.5 ui:text-sm ui:text-slate-500">
              {status}
            </p>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
