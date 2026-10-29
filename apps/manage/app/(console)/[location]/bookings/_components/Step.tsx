"use client";

import { SURFACE } from "@repo/console/Card";
import { StepMark } from "@repo/console/StepMark";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * One step of a booking form, a numbered card on the page with the
 * others: open, its number in a brand ring, its name and its fields;
 * folded, a line with its mark, its name and what was entered, and
 * "Edit" to open it again. Only one step is open at a time; the form
 * decides which. A step opened by "Edit" or "Continue" scrolls into view
 * and takes the focus at its first field.
 */
export function Step({
  number,
  title,
  done,
  optional = false,
  hint,
  summary,
  open,
  onOpen,
  children,
}: {
  number: number;
  title: string;
  /** Everything it needs is entered. */
  done: boolean;
  /** Nothing in it is needed: "Optional" stands by its name. */
  optional?: boolean;
  /** A short line under the open step's name: "One vehicle for every trip". */
  hint?: string;
  /** What was entered, in a line, for the folded step. */
  summary: ReactNode;
  open: boolean;
  onOpen: () => void;
  /** The fields, and the step's foot. */
  children: ReactNode;
}) {
  const card = useRef<HTMLElement>(null);
  const wasOpen = useRef(open);
  useEffect(() => {
    if (open && !wasOpen.current) {
      const node = card.current;
      node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      node
        ?.querySelector<HTMLElement>(
          "input:not([type=hidden]), button, select, textarea",
        )
        ?.focus({ preventScroll: true });
    }
    wasOpen.current = open;
  }, [open]);

  const name = (
    <span className="text-base font-bold tracking-[-0.01em] text-ink">
      {title}
      {optional ? (
        <span className="ml-2 text-[13px] font-normal text-muted">
          Optional
        </span>
      ) : null}
    </span>
  );

  return (
    <section
      ref={card}
      aria-label={title}
      className={cx("min-w-0 scroll-mt-20", SURFACE)}
    >
      {open ? (
        <>
          <h2 className="flex items-center gap-3.5 border-b border-hairline px-5 py-4">
            <span
              aria-hidden="true"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-brand text-xs font-bold text-brand tabular-nums"
            >
              {number}
            </span>
            <span className="grid min-w-0 gap-0.5">
              {name}
              {hint ? (
                <span className="text-[13px] font-normal text-muted">
                  {hint}
                </span>
              ) : null}
            </span>
          </h2>
          <div className="p-5">{children}</div>
        </>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3.5 rounded-card px-5 py-4 text-left transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-brand"
        >
          <StepMark number={number} done={done} className="size-7 text-xs" />
          <span className="grid min-w-0 gap-0.5">
            {name}
            <span className="truncate text-[13px] text-muted">{summary}</span>
          </span>
          <span className="text-sm font-semibold text-brand">
            {done ? "Edit" : "Open"}
          </span>
        </button>
      )}
    </section>
  );
}

/**
 * The foot of an open step: what is still missing, then its button to the
 * next step at the end, and before them anything else the step does, as
 * "Remove trip".
 */
export function StepFoot({
  label = "Continue",
  disabled,
  missing,
  onNext,
  aside,
}: {
  label?: string;
  disabled: boolean;
  /** Why the step cannot be left yet, in a sentence; null once it can. */
  missing: string | null;
  onNext: () => void;
  aside?: ReactNode;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
      {aside ? <div className="mr-auto">{aside}</div> : null}
      {missing ? (
        <p aria-live="polite" className="text-sm text-muted">
          {missing}
        </p>
      ) : null}
      <Button disabled={disabled} onClick={onNext}>
        {label}
      </Button>
    </div>
  );
}
