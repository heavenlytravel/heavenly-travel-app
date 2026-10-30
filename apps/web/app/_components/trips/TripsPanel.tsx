"use client";

import type { ReactNode } from "react";
import type { BBox, TripCategory } from "@repo/db";
import { scrollBehavior } from "@repo/ui/motion";
import type { PlacePresets } from "@repo/ui/place-input";
import type { FieldKey } from "../../_lib/search";
import type { PlannedTrip } from "../../_lib/trip-plan";
import { AddAnotherTrip, TripForm } from "./TripForm";
import {
  TripsBar,
  TripsFold,
  UnderHeader,
  underHeaderFrame,
  useLarge,
  useTripsSheet,
} from "./TripsBar";
import { TripTimeline, type TripNote } from "./TripTimeline";
import type { Planner } from "./usePlanner";

/**
 * The booking's trips, on the search card and at the top of the vehicle
 * page: the list, then the form while a trip is open, then one row with
 * the form's buttons, or "Add another trip" while it is closed, on the
 * left, and `passengers` and `action` (the search card's send button) on
 * the right; on a phone they stack, a line between the trip and the
 * booking. With no trips yet, as on a fresh search card, it is the form
 * alone. `foldOnSmall` folds it into one line on a phone, as on the
 * vehicle page, which pins under the site header as the page scrolls;
 * `attention` unfolds it when a trip turns red. Otherwise, once the list
 * scrolls away, a thin bar slides in under the site header with the trips
 * in a few words and `summary`, or "Plan a trip" before there is one;
 * choosing it opens them in a sheet below it, which folds again once the
 * page scrolls. From `lg` the sheet holds the form too, so a trip is
 * changed or added without scrolling back up, only the list scrolling
 * inside it and the place suggestions hanging below; on a phone it holds
 * the list and the foot, and choosing a trip or "Add another trip", or
 * the bar itself before there is a trip, goes back up to the form in the
 * page. `className` draws the frame.
 */
export function TripsPanel({
  planner,
  category,
  priceOf,
  noteOf,
  summary,
  passengers,
  action,
  foldOnSmall = false,
  attention = false,
  presetsOf,
  near,
  className,
}: {
  planner: Planner;
  category: TripCategory;
  priceOf?: (trip: PlannedTrip) => ReactNode;
  noteOf?: (trip: PlannedTrip) => TripNote | null;
  /** The bar's last words, such as the group, the vehicle and the total. */
  summary?: ReactNode;
  /** The group's size, at the foot. */
  passengers: ReactNode;
  /** After it, such as the search card's send button. */
  action?: ReactNode;
  foldOnSmall?: boolean;
  /** A trip is marked in red: unfold. */
  attention?: boolean;
  /** What a place field offers when it is opened empty. */
  presetsOf?: (key: FieldKey) => PlacePresets | undefined;
  /** The box whose places the place fields suggest first. */
  near?: BBox;
  className: string;
}) {
  const { watch, element, away, open, setOpen } = useTripsSheet();
  const large = useLarge();
  const { trips } = planner;
  const any = trips.length > 0;
  // The form is in one place at a time: from lg, the sheet while it is open.
  const formInSheet = open && large;

  /** On a phone: back up to the trips in the page, and `then` there. */
  function backToPage(then: () => void) {
    setOpen(false);
    then();
    element?.scrollIntoView({ block: "start", behavior: scrollBehavior() });
  }

  // A box that scrolls clips a ring drawn outside a trip, so there it is
  // drawn inside: the bar's sheets, and the phone's fold.
  const folded = foldOnSmall && any;
  const list = (onPick: (id: string) => void, focusRing: string) =>
    any ? (
      <TripTimeline
        trips={trips}
        open={planner.editing}
        onPick={onPick}
        priceOf={priceOf}
        noteOf={noteOf}
        focusRing={focusRing}
        className={planner.form ? "mb-5" : "mb-3"}
      />
    ) : null;
  // Right of the trip's buttons in one row; on a phone, under a line.
  const foot = (
    <>
      <span className="hidden flex-1 @3xl:block" />
      <span
        aria-hidden
        className="my-1 w-full border-t border-hairline @3xl:hidden"
      />
      {passengers}
      {action}
    </>
  );
  const closed = (onAdd: () => void) => (
    <div className="flex flex-wrap items-center gap-3">
      <AddAnotherTrip onClick={onAdd} />
      {foot}
    </div>
  );
  const rest = planner.form ? (
    <TripForm
      planner={planner}
      category={category}
      presetsOf={presetsOf}
      near={near}
    >
      {foot}
    </TripForm>
  ) : (
    closed(() => planner.openNew())
  );
  const body = (
    <div className="@container">
      {list(
        planner.open,
        folded ? "max-lg:focus-ring-inset lg:focus-ring" : "focus-ring",
      )}
      {formInSheet ? null : rest}
    </div>
  );

  return (
    <>
      {folded ? (
        <TripsFold
          trips={trips}
          summary={summary}
          attention={attention}
          watch={watch}
          className={className}
        >
          {body}
        </TripsFold>
      ) : (
        <section
          ref={watch}
          aria-label={any ? "Your trips" : undefined}
          className={className}
        >
          {body}
        </section>
      )}

      <UnderHeader
        shown={away}
        className={foldOnSmall ? "hidden lg:block" : ""}
      >
        <TripsBar
          trips={trips}
          summary={summary}
          open={open}
          onOpenChange={(next) => {
            // No trip yet on a phone: the form is up in the page.
            if (next && !any && !large) backToPage(() => {});
            else setOpen(next);
          }}
          className={underHeaderFrame}
        >
          {large ? (
            <>
              {/* Only the list scrolls, so the form below it stays in view. */}
              <div className="max-h-[40dvh] overflow-y-auto">
                {list(planner.open, "focus-ring-inset")}
              </div>
              {formInSheet ? <div className="@container">{rest}</div> : null}
            </>
          ) : (
            <div className="@container">
              <div className="max-h-[40dvh] overflow-y-auto">
                {list(
                  (id) => backToPage(() => planner.open(id)),
                  "focus-ring-inset",
                )}
              </div>
              {closed(() => backToPage(() => planner.openNew()))}
            </div>
          )}
        </TripsBar>
      </UnderHeader>
    </>
  );
}
