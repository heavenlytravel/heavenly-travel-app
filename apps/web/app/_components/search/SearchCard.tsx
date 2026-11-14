"use client";

import { useId, useState, type ReactNode } from "react";
import { plural, type BBox, type TripCategory } from "@repo/db";
import { Button } from "@repo/ui/button";
import type { PlacePresets } from "@repo/ui/place-input";
import type { FieldKey } from "../../_lib/search";
import type { PlannedTrip } from "../../_lib/trip-plan";
import {
  bookableCategory,
  tripBookingPath,
} from "../../_lib/transportation-booking";
import { useNavigate } from "../../_lib/useNavigate";
import {
  clearOfHeader,
  TripsBar,
  UnderHeader,
  useLarge,
  useTripsSheet,
} from "../trips/TripsBar";
import { NO_PASSENGERS } from "../trips/PassengersStepper";
import { useNewBooking } from "../trips/useNewBooking";
import look from "./search-card.module.css";
import { useSearchCard } from "./SearchProvider";
import { ServiceDock } from "./ServiceDock";
import { AddTrip, TripRows } from "./TripRows";
import type { TripRows as Trips } from "./useTripRows";

/**
 * The search card, on the home page's hero, a location's and a service
 * hub's: the six services in a dock of the brand's blue glass, then the
 * chosen service's trips (`TripSearchPanel`). Only car with driver and coach
 * charter are booked online; the dock marks the others "Soon". The chosen
 * service, the trips and the group's size are the `SearchProvider`'s
 * above it, which is how a place's "Take Me Here" fills a trip in. See
 * docs/261027-multi-trip-booking.md, "The search card".
 */
export function SearchCard() {
  const { product, setProduct } = useSearchCard();
  const category = bookableCategory(product.key);
  return (
    <div className="@container">
      <div className="flex justify-center py-1.5">
        <ServiceDock chosen={product.key} onChoose={setProduct} />
      </div>
      {category ? <CardTrips category={category} /> : null}
    </div>
  );
}

/** The card's trips: "Search" sends them to the category's vehicle page. */
function CardTrips({ category }: { category: TripCategory }) {
  const { trips, passengers, setPassengers, presetsOf, near } = useSearchCard();
  const newBooking = useNewBooking();
  const { pending, go } = useNavigate();
  return (
    <>
      <TripSearchPanel
        category={category}
        trips={trips}
        passengers={passengers}
        onPassengers={setPassengers}
        presetsOf={presetsOf}
        near={near}
        pending={pending}
        onSend={async (sent) => {
          // Asks first when they would replace trips the customer has.
          if (await newBooking.start(category, sent, passengers)) {
            go(tripBookingPath(category));
          }
        }}
        className="mt-1.5"
      />
      {newBooking.dialog}
    </>
  );
}

/** "Add Another Trip" after the form: where the boxes stand in a row. */
const wideOnly = "@max-5xl:hidden";

/** The photo the glass brings along where none lies behind it (`look.frosted`). */
const FROST = {
  "--frost-photo": "url(/brand/hero-langkawi.jpg)",
} as React.CSSProperties;

/**
 * A booking's trips as every page asks them: a row each (`TripRows`) in a
 * panel of the brand's blue glass, "Add Another Trip", and the send button,
 * "Search", which checks every row and hands the trips to `onSend`; it
 * says "Searching…" while `pending`. Over a photo the panel is glass and
 * "Add Another Trip" floats under it; on a plain page (`plain`) the
 * panel brings the photo along (`look.frosted`), so it looks the same,
 * with the button inside. Once the panel scrolls away the trips are held
 * under the header in a bar of the same look, whose sheet holds the same
 * form over the same rows, so what is typed in one is in the other.
 */
export function TripSearchPanel({
  category,
  trips,
  passengers,
  onPassengers,
  presetsOf,
  near,
  onSend,
  pending,
  alertsOf,
  summary,
  plain = false,
  className = "",
}: {
  category: TripCategory;
  trips: Trips;
  passengers: number;
  onPassengers: (passengers: number) => void;
  /** What a place field offers when it is opened empty. */
  presetsOf?: (key: FieldKey) => PlacePresets | undefined;
  /** The box whose places the place fields suggest first. */
  near?: BBox;
  onSend: (trips: PlannedTrip[]) => void | Promise<void>;
  pending: boolean;
  /** What the page says of a row's trip, such as why it cannot be priced. */
  alertsOf?: (id: string) => string[];
  /** The bar's last words; the group's size when none. */
  summary?: ReactNode;
  /** On a plain page, no photo behind it. */
  plain?: boolean;
  className?: string;
}) {
  const { watch, away, open, setOpen } = useTripsSheet();
  const large = useLarge();
  const scope = useId();
  // Why the group cannot be sent: shown once a search found none.
  const [groupIssue, setGroupIssue] = useState<string | null>(null);

  function changePassengers(next: number) {
    onPassengers(next);
    if (next > 0) setGroupIssue(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sent = trips.collect();
    const noGroup = passengers < 1;
    setGroupIssue(noGroup ? NO_PASSENGERS : null);
    if (sent && !noGroup) await onSend(sent);
  }

  const send = (buttonClassName: string) => (
    <Button
      type="submit"
      size="lg"
      pending={pending}
      className={`shadow-[0_0_0_1px_rgb(255_255_255/0.45)] ${buttonClassName}`}
    >
      {pending ? (
        "Searching…"
      ) : (
        <>
          Search <span aria-hidden>&nbsp;→</span>
        </>
      )}
    </Button>
  );

  /** The trips' rows, in the panel or in the sheet under the header. */
  const rows = (place: "panel" | "sheet", rowsClassName?: string) => (
    <TripRows
      scope={`${scope}-${place}`}
      trips={trips}
      category={category}
      passengers={passengers}
      onPassengers={changePassengers}
      groupIssue={groupIssue}
      presetsOf={presetsOf}
      near={near}
      send={send}
      addTrip={<AddTrip trips={trips} />}
      alertsOf={alertsOf}
      rowsClassName={rowsClassName}
    />
  );

  // In the sheet, rows too many for the screen scroll on their own, so the
  // group's size and the send button stay in view under them: with the
  // boxes one under the other on a phone, that is from the second trip.
  const scrolls = trips.rows.length > (large ? 4 : 1);

  return (
    <form
      onSubmit={submit}
      noValidate
      style={FROST}
      className={`@container ${className}`}
    >
      {/* Raised over "Add Another Trip" after it: the glass is a layer of
          its own, so a place list opened in the last row could not
          otherwise hang over the button. */}
      <section
        ref={watch}
        aria-label="Your Trips"
        className={`${plain ? `${look.frosted} [--frost-radius:var(--radius-panel)]` : look.panel} relative z-(--layer-raised) rounded-panel p-4 ${clearOfHeader}`}
      >
        {rows("panel")}
        {plain ? <AddTrip trips={trips} className={wideOnly} /> : null}
      </section>
      {plain ? null : <AddTrip trips={trips} className={wideOnly} />}

      <UnderHeader shown={away}>
        <TripsBar
          trips={trips.complete}
          summary={
            summary ??
            (passengers > 0 ? plural(passengers, "passenger") : undefined)
          }
          open={open}
          onOpenChange={setOpen}
          tone="dark"
          className={`${look.frosted} rounded-b-card text-white [--frost-radius:0_0_var(--radius-card)_var(--radius-card)]`}
        >
          {/* Only while it is open: the fields are then named once a page. */}
          {open ? (
            <div className="@container">
              {rows(
                "sheet",
                scrolls
                  ? "max-h-[42dvh] overflow-y-auto overscroll-contain"
                  : undefined,
              )}
              <AddTrip trips={trips} className={wideOnly} />
            </div>
          ) : null}
        </TripsBar>
      </UnderHeader>
    </form>
  );
}
