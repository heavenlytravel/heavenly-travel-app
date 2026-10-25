"use client";

import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { useEffect, useRef, type ReactNode } from "react";
import { StepMark } from "../../../_components/StepMark";

/**
 * One step of a booking form, on the page with the others: open, it is a
 * card with its fields; folded, a line with its mark, its name and what
 * was entered, and "Edit" to open it again. Only one step is open at a
 * time; the form decides which. A step opened by "Edit" or "Continue"
 * scrolls into view and takes the focus at its first field.
 */
export function Step({
  number,
  title,
  done,
  optional = false,
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
  /** What was entered, in a line, for the folded step. */
  summary: ReactNode;
  open: boolean;
  onOpen: () => void;
  /** The fields, and the step's "Continue". */
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

  const heading = (
    <span className="flex min-w-0 items-center gap-3">
      {open ? (
        <span
          aria-hidden="true"
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-white tabular-nums"
        >
          {number}
        </span>
      ) : (
        <StepMark number={number} done={done} />
      )}
      <span className="text-base font-semibold tracking-tight">{title}</span>
      {optional ? (
        <span className="text-xs font-normal text-slate-500">Optional</span>
      ) : null}
    </span>
  );

  return (
    <section
      ref={card}
      aria-label={title}
      className={cx(
        "scroll-mt-20 rounded-xl border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        open ? "border-slate-300 p-6" : "border-slate-200",
      )}
    >
      {open ? (
        <>
          <h2 className="mb-5">{heading}</h2>
          {children}
        </>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="grid w-full grid-cols-[1fr_auto] items-center gap-4 rounded-xl px-6 py-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand"
        >
          <span className="grid min-w-0 gap-1">
            {heading}
            <span className="truncate pl-8 text-sm text-slate-600">
              {summary}
            </span>
          </span>
          <span className="text-sm font-medium underline-offset-4">
            {done ? "Edit" : "Open"}
          </span>
        </button>
      )}
    </section>
  );
}

/** The foot of an open step: its button to the next step, and what is still missing. */
export function StepFoot({
  label = "Continue",
  disabled,
  missing,
  onNext,
}: {
  label?: string;
  disabled: boolean;
  /** Why the step cannot be left yet, in a sentence; null once it can. */
  missing: string | null;
  onNext: () => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <Button disabled={disabled} onClick={onNext}>
        {label}
      </Button>
      {missing ? (
        <p aria-live="polite" className="text-sm text-slate-500">
          {missing}
        </p>
      ) : null}
    </div>
  );
}
