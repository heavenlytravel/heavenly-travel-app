"use client";

import {
  useEffect,
  useEffectEvent,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ChevronDownIcon, MapIcon } from "@repo/ui/icons";
import { focus } from "../../(site)/_components/Page";
import { spanOf, type PlannedTrip } from "../../_lib/trip-plan";

/** The site header's height, plus its border: 68px, 76px from `sm`. What pins under it sits at this top. */
const UNDER_HEADER = "top-[69px] sm:top-[77px]";
const HEADER_PX = 77;

/** Where a page's trips stop folding on a phone: Tailwind's `lg`. */
const LARGE = "(min-width: 64rem)";

/** How far the page may scroll before an open sheet folds: a nudge does not. */
const FOLD_AFTER_PX = 24;

/** The frame of a bar held under the site header: its sides and foot drawn, its top the header's. */
export const underHeaderFrame =
  "rounded-b-[18px] border border-t-0 border-slate-200 bg-white shadow-[0_18px_40px_rgba(0,38,75,0.14)]";

/** A scroll the customer can follow, or a jump when they ask for less motion. */
export function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

function onLargeChange(listener: () => void) {
  const large = window.matchMedia(LARGE);
  large.addEventListener("change", listener);
  return () => large.removeEventListener("change", listener);
}

/** Whether the screen is `lg` or wider; false on the server and a phone. */
export function useLarge() {
  return useSyncExternalStore(
    onLargeChange,
    () => window.matchMedia(LARGE).matches,
    () => false,
  );
}

/**
 * Folds an open sheet once the page scrolls, as a pinned sheet should,
 * unless the customer is typing: a phone's keyboard scrolls the page
 * itself to show the field.
 */
export function useFoldOnScroll(open: boolean, fold: () => void) {
  const onScrolled = useEffectEvent(fold);
  useEffect(() => {
    if (!open) return;
    const from = window.scrollY;
    function onScroll() {
      const typing = document.activeElement?.matches(
        "input, textarea, select, [contenteditable='true']",
      );
      if (!typing && Math.abs(window.scrollY - from) > FOLD_AFTER_PX) {
        onScrolled();
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);
}

/**
 * The booking's trips in one line: how many and the days they span, or
 * "Plan a trip" before there is one, then `summary` (on a line of its own
 * on a phone) and Show or Hide.
 */
function TripsLine({
  trips,
  summary,
  open,
  onToggle,
  className = "",
}: {
  trips: readonly PlannedTrip[];
  summary?: ReactNode;
  open: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`flex min-h-[46px] w-full items-center gap-3 px-4 py-2.5 text-left text-[0.92rem] sm:px-5 ${className} ${focus}`}
    >
      <MapIcon className="size-[18px] shrink-0 text-brand" />
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <b className="shrink-0 text-ink">
          {trips.length === 0
            ? "Plan a trip"
            : trips.length === 1
              ? "1 trip"
              : `${trips.length} trips`}
        </b>
        <span className="min-w-0 truncate text-slate-600">
          {trips.length === 0 ? "Where and when" : spanOf(trips)}
        </span>
        {summary ? (
          <span className="w-full font-semibold text-ink sm:ml-auto sm:w-auto">
            {summary}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-1 font-semibold text-brand">
        {open ? "Hide" : "Show"}
        <ChevronDownIcon
          className={`size-4 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </span>
    </button>
  );
}

/**
 * The trips' line with `children` unfolding under it with a short
 * animation, for the bar under the site header. Escape folds them again.
 * They are clipped while they move and free once open, so a place field's
 * suggestions can hang below the bar. `className` draws its frame.
 */
export function TripsBar({
  trips,
  summary,
  open,
  onOpenChange,
  className,
  children,
}: {
  trips: readonly PlannedTrip[];
  /** The line's last words, such as the vehicle and the total. */
  summary?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  children: ReactNode;
}) {
  const [settled, setSettled] = useState(false);

  function show(next: boolean) {
    setSettled(
      next && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    onOpenChange(next);
  }

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) show(false);
      }}
      className={className}
    >
      <TripsLine
        trips={trips}
        summary={summary}
        open={open}
        onToggle={() => show(!open)}
      />
      <div
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget && open) setSettled(true);
        }}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        {/* Hidden while folded, as soon as it has moved out of view. */}
        <div
          className={`min-h-0 transition-[visibility] duration-300 motion-reduce:transition-none ${
            open && settled ? "overflow-visible" : "overflow-hidden"
          } ${open ? "visible" : "invisible"}`}
        >
          <div className="border-t border-slate-100 px-3 pt-3 pb-4 sm:px-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * A page's trips on a phone: folded into one line in their place, which
 * pins under the site header once the page scrolls past it. Choosing it
 * opens them in a sheet hung from the line, over the page, wherever the
 * line is; the sheet scrolls on its own when long, and folds again once
 * the page scrolls. It unfolds by itself when `attention` turns true, so
 * a trip marked in red is not left folded away. From `lg` it is no fold:
 * `children` as they are. `watch` is given its element, and `className`
 * draws its frame.
 */
export function TripsFold({
  trips,
  summary,
  attention = false,
  label = "Your trips",
  watch,
  className,
  children,
}: {
  trips: readonly PlannedTrip[];
  summary?: ReactNode;
  /** Something in it needs the customer, such as a trip marked in red. */
  attention?: boolean;
  label?: string;
  watch?: (element: HTMLElement | null) => void;
  className: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [noticed, setNoticed] = useState(false);
  if (attention !== noticed) {
    setNoticed(attention);
    if (attention) setOpen(true);
  }
  useFoldOnScroll(open, () => setOpen(false));

  return (
    <section
      ref={watch}
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) setOpen(false);
      }}
      className={`sticky ${UNDER_HEADER} z-20 lg:static ${
        open ? "max-lg:rounded-b-none" : ""
      } ${className}`}
    >
      <TripsLine
        trips={trips}
        summary={summary}
        open={open}
        onToggle={() => setOpen(!open)}
        className="lg:hidden"
      />
      {/* On a phone a sheet over the page, taking no room in it; from lg the trips in place. */}
      <div
        className={`absolute inset-x-0 top-full max-h-[60dvh] overflow-y-auto rounded-b-[18px] border-t border-slate-100 bg-white px-3 pt-3 pb-4 shadow-[0_18px_40px_rgba(0,38,75,0.14)] transition-[opacity,translate,visibility] duration-200 ease-out motion-reduce:transition-none sm:px-4 ${
          open ? "visible opacity-100" : "invisible -translate-y-1 opacity-0"
        } lg:visible lg:static lg:max-h-none lg:translate-y-0 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:opacity-100 lg:shadow-none`}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * Watches the trips at the top of a page, given as `watch` on their
 * element: `away` once they have gone up under the site header, and
 * whether the bar's sheet is `open`, which folds once they are back in
 * view or the page scrolls. A callback ref, so a page that shows the
 * trips only once the plan is read still starts watching; `element` is
 * the one watched.
 */
export function useTripsSheet() {
  const [element, watch] = useState<HTMLElement | null>(null);
  const [away, setAway] = useState(false);
  const [open, setOpen] = useState(false);
  useFoldOnScroll(open, () => setOpen(false));

  useEffect(() => {
    if (!element) return;
    // Away once its foot has gone under the site header.
    const observer = new IntersectionObserver(
      ([entry]) => {
        const gone =
          !entry!.isIntersecting && entry!.boundingClientRect.top < 0;
        setAway(gone);
        if (!gone) setOpen(false);
      },
      { rootMargin: `-${HEADER_PX}px 0px 0px 0px` },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return { watch, element, away, open, setOpen };
}

/** Holds a bar under the site header, sliding in while `shown`, out of reach while not. `className` limits where it shows. */
export function UnderHeader({
  shown,
  className = "",
  children,
}: {
  shown: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      inert={!shown}
      className={`fixed inset-x-0 ${UNDER_HEADER} z-20 transition duration-300 ease-out motion-reduce:transition-none ${
        shown
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-3 opacity-0"
      } ${className}`}
    >
      <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8">
        {children}
      </div>
    </div>
  );
}
