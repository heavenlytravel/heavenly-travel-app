"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { TripCategory } from "@repo/db";
import { ChevronDownIcon, MapIcon, PlusIcon } from "@repo/ui/icons";
import { focus, panel } from "../../(site)/_components/Page";
import { spanOf, type PlannedTrip } from "../../_lib/trip-plan";
import { TripForm } from "./TripForm";
import { TripTimeline, type TripNote } from "./TripTimeline";
import type { Planner } from "./usePlanner";

/** The site header's height, which the bar slides in under: 68px, 76px from `sm`, plus its border. */
const HEADER = "top-[69px] sm:top-[77px]";
const HEADER_PX = 77;

/**
 * The booking's trips at the top of the vehicle page: the list, and the
 * form when a trip is open or "Add a trip" to open one. Once the list
 * scrolls away, a thin bar slides in under the site header with the trips
 * in a few words and `summary`; choosing it opens the list in a sheet
 * below it, with a short animation, where a trip is changed or added
 * without scrolling back up. Only the list scrolls inside the sheet, and
 * the form's place suggestions hang below it.
 */
export function TripsPanel({
  planner,
  category,
  priceOf,
  noteOf,
  summary,
}: {
  planner: Planner;
  category: TripCategory;
  priceOf?: (trip: PlannedTrip) => ReactNode;
  noteOf?: (trip: PlannedTrip) => TripNote | null;
  /** The bar's last words, such as the vehicle and the total. */
  summary?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [away, setAway] = useState(false);
  const [sheet, setSheet] = useState(false);
  // Clipped while it opens and closes; free once open, so a place's
  // suggestions can hang below it.
  const [settled, setSettled] = useState(false);
  const { trips } = planner;

  function showSheet(open: boolean) {
    setSheet(open);
    setSettled(
      open && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    // Away once its foot has gone under the site header.
    const watch = new IntersectionObserver(
      ([entry]) => {
        const gone =
          !entry!.isIntersecting && entry!.boundingClientRect.top < 0;
        setAway(gone);
        if (!gone) {
          setSheet(false);
          setSettled(false);
        }
      },
      { rootMargin: `-${HEADER_PX}px 0px 0px 0px` },
    );
    watch.observe(section);
    return () => watch.disconnect();
  }, []);

  const list = (
    <TripTimeline
      trips={trips}
      open={planner.editing}
      onPick={planner.open}
      priceOf={priceOf}
      noteOf={noteOf}
      className={planner.form ? "mb-5" : "mb-3"}
    />
  );
  // The form is in one place at a time: the sheet while it is open.
  const form = planner.form ? (
    <TripForm planner={planner} category={category} />
  ) : (
    <button
      type="button"
      onClick={() => planner.openNew()}
      className={`mx-1 inline-flex items-center gap-1.5 text-[0.95rem] font-semibold text-brand hover:underline ${focus}`}
    >
      <PlusIcon className="size-4" />
      Add a trip
    </button>
  );

  return (
    <>
      <section
        ref={ref}
        aria-label="Your trips"
        className={`${panel} mb-8 scroll-mt-28`}
      >
        {list}
        {sheet ? null : form}
      </section>

      <div
        inert={!away}
        onKeyDown={(e) => {
          if (e.key === "Escape") showSheet(false);
        }}
        className={`fixed inset-x-0 ${HEADER} z-20 transition duration-300 ease-out motion-reduce:transition-none ${
          away
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0"
        }`}
      >
        <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8">
          <div className="rounded-b-[18px] border border-t-0 border-slate-200 bg-white shadow-[0_18px_40px_rgba(0,38,75,0.14)]">
            <button
              type="button"
              onClick={() => showSheet(!sheet)}
              aria-expanded={sheet}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[0.92rem] sm:px-5 ${focus}`}
            >
              <MapIcon className="size-[18px] shrink-0 text-brand" />
              <b className="shrink-0 text-ink">
                {trips.length === 1 ? "1 trip" : `${trips.length} trips`}
              </b>
              <span className="min-w-0 truncate text-slate-600">
                {spanOf(trips)}
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-3">
                {summary ? (
                  <span className="hidden font-semibold text-ink sm:inline">
                    {summary}
                  </span>
                ) : null}
                <span className="flex items-center gap-1 font-semibold text-brand">
                  {sheet ? "Hide" : "Show"}
                  <ChevronDownIcon
                    className={`size-4 transition-transform duration-300 ${
                      sheet ? "rotate-180" : ""
                    }`}
                  />
                </span>
              </span>
            </button>
            <div
              onTransitionEnd={(e) => {
                if (e.target === e.currentTarget && sheet) setSettled(true);
              }}
              className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                sheet ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div
                inert={!sheet}
                className={`min-h-0 ${settled ? "overflow-visible" : "overflow-hidden"}`}
              >
                <div className="border-t border-slate-100 px-3 pt-3 pb-4 sm:px-4">
                  {/* Only the list scrolls, so the form below it stays in view. */}
                  <div className="max-h-[40dvh] overflow-y-auto">{list}</div>
                  {sheet ? form : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
