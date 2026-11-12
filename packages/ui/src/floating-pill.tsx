"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { cx } from "./cx.js";
import { ChevronDownIcon } from "./icons.js";

/** A button or link on the pill: round, on the ink, the keyboard's ring in white. */
export const pillButtonClass =
  "ui:inline-flex ui:min-h-9 ui:shrink-0 ui:cursor-pointer ui:items-center ui:gap-1.5 ui:rounded-full ui:px-3 ui:font-semibold ui:whitespace-nowrap ui:hover:bg-white/10 ui:focus-ring ui:focus-ring-dark";

/*
 * Whether each pill is folded, kept for the tab (sessionStorage), so a
 * pill stays folded from page to page. Read through one store, so every
 * pill under the same key agrees; storage that throws (a private window)
 * leaves it in memory.
 */
const folds = new Map<string, boolean>();
const listeners = new Set<() => void>();

function readFold(key: string): boolean {
  if (!folds.has(key)) {
    try {
      folds.set(key, sessionStorage.getItem(`ui-pill:${key}`) === "folded");
    } catch {
      folds.set(key, false);
    }
  }
  return folds.get(key)!;
}

function writeFold(key: string, folded: boolean) {
  folds.set(key, folded);
  try {
    if (folded) sessionStorage.setItem(`ui-pill:${key}`, "folded");
    else sessionStorage.removeItem(`ui-pill:${key}`);
  } catch {
    // Kept in memory for this page only.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * A dark pill floating at the foot of the window, over the page and
 * taking no room in it: what staff see over a page they are previewing or
 * viewing as someone. Its body (`children`: what it says and its buttons)
 * folds sideways into the round button at its end, and widens back, from
 * that one button, which keeps the focus. Folded, the button can carry a
 * `badge`, such as a status dot. `above` stands over the pill, as a panel
 * one of its buttons opened. Each `storageKey` is folded or not for the
 * whole tab.
 */
export function FloatingPill({
  label,
  foldLabel,
  unfoldLabel,
  storageKey,
  badge,
  above,
  className,
  onFoldChange,
  children,
}: {
  /** The landmark's name: "Preview", "Viewing as". */
  label: string;
  /** The button's name while open: "Fold the preview bar". */
  foldLabel: string;
  /** Its name while folded, saying what is hidden: "Show the preview bar: Sedan, Published". */
  unfoldLabel: string;
  storageKey: string;
  /** On the folded button, at its corner. */
  badge?: ReactNode;
  /** Over the pill: a panel opened from it. */
  above?: ReactNode;
  /** Where it floats and its text: `ui:bottom-4` when left out. */
  className?: string;
  onFoldChange?: (folded: boolean) => void;
  children: ReactNode;
}) {
  const folded = useSyncExternalStore(
    subscribe,
    () => readFold(storageKey),
    () => false,
  );
  // Only a press moves it; a page that opens folded is folded at once.
  const [moving, setMoving] = useState(false);

  const toggle = () => {
    setMoving(true);
    writeFold(storageKey, !folded);
    onFoldChange?.(!folded);
  };

  return (
    <aside
      aria-label={label}
      className={cx(
        "ui:pointer-events-none ui:fixed ui:inset-x-0 ui:z-(--layer-staff) ui:flex ui:flex-col ui:items-center ui:gap-2 ui:px-3 ui:text-white",
        className ?? "ui:bottom-4",
      )}
    >
      {above}
      <div className="ui:pointer-events-auto ui:flex ui:max-w-full ui:items-center ui:rounded-full ui:bg-ink ui:p-1 ui:shadow-overlay ui:ring-1 ui:ring-white/15">
        <div
          className="ui-pill-body ui:min-w-0"
          data-open={folded ? undefined : ""}
          data-moving={moving ? "" : undefined}
          onTransitionEnd={(event) => {
            if (
              event.target === event.currentTarget &&
              event.propertyName === "grid-template-columns"
            ) {
              setMoving(false);
            }
          }}
          inert={folded}
        >
          {/* Padded inside the clip, so the folded pill is round. */}
          <div className="ui:min-w-0 ui:overflow-hidden">
            <div className="ui:flex ui:items-center ui:gap-1 ui:pl-3">
              {children}
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label={folded ? unfoldLabel : foldLabel}
          aria-expanded={!folded}
          onClick={toggle}
          className="ui:relative ui:flex ui:size-9 ui:shrink-0 ui:cursor-pointer ui:items-center ui:justify-center ui:rounded-full ui:hover:bg-white/10 ui:focus-ring ui:focus-ring-dark"
        >
          <ChevronDownIcon
            className={cx(
              "ui:size-5 ui:transition-transform ui:duration-200 ui:motion-reduce:transition-none",
              folded && "ui:rotate-180",
            )}
          />
          {folded && badge ? (
            <span className="ui:absolute ui:top-0.5 ui:right-0.5 ui:flex ui:rounded-full ui:ring-2 ui:ring-ink">
              {badge}
            </span>
          ) : null}
        </button>
      </div>
    </aside>
  );
}
