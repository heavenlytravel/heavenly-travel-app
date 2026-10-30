"use client";

import { Button } from "@repo/ui/button";
import { PRODUCTS, type Product } from "../../_lib/search";
import {
  bookableCategory,
  tripBookingPath,
} from "../../_lib/transportation-booking";
import { useNavigate } from "../../_lib/useNavigate";
import { ProductIcon } from "../Brand";
import { PassengersStepper } from "../trips/PassengersStepper";
import { clearOfHeader } from "../trips/TripsBar";
import { TripsPanel } from "../trips/TripsPanel";
import { useNewBooking } from "../trips/useNewBooking";
import { useSearchCard } from "./SearchProvider";

/** A tab's id, which its panel is named by and the arrow keys move to. */
const tabId = (key: Product["key"]) => `svc-tab-${key}`;

/** All six services, in the order the tabs show them. */
const TABS: Product[] = [
  PRODUCTS["car-with-driver"],
  PRODUCTS["coach-charter"],
  PRODUCTS.attraction,
  PRODUCTS.hotel,
  PRODUCTS.rental,
  PRODUCTS.package,
];

/**
 * Six services as a row of icon tabs, then the trip planner, as on the
 * vehicle page: the kind of trip as two radios, the places, the hours of
 * a hire and when, in one joined row. Car with driver and coach charter
 * can be sent; the other tabs are disabled until their flows exist. One
 * trip is typed and priced as before; "Add another trip" puts it in
 * "Your trips", by date, which stays open, and opens the next; choosing a
 * trip of the list opens it in the row to change. Once the card scrolls
 * away the trips follow the page in a bar under the header. The group's
 * size is asked once, beside the send button, for the one vehicle that
 * does every trip. "Get prices" sends the list with the trip in the row,
 * when one is typed, to the vehicle page of the category, asking first
 * when it would replace trips the customer already has; the button says
 * so while that page opens. Its state is the `SearchProvider`'s above it, which is how a card elsewhere
 * on the page fills a place in. On a location's pages the place fields
 * suggest the location's area first, and any trip is sent as from the
 * home page: the vehicle page says which location prices it, or why none
 * can. See docs/261027-multi-trip-booking.md, "The search card".
 */
export function ServiceTabsSearch() {
  const {
    product,
    setProduct,
    planner,
    passengers,
    setPassengers,
    presetsOf,
    near,
  } = useSearchCard();
  const category = bookableCategory(product.key);
  const newBooking = useNewBooking();
  const { pending, go } = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) return;
    const trips = planner.collect();
    if (!trips) return;
    if (await newBooking.start(category, trips, passengers)) {
      go(tripBookingPath(category));
    }
  }

  /**
   * The tabs' keys: Left and Right move to the service before or after,
   * round the ends, Home and End to the first and the last, passing over
   * the ones not booked yet; the one moved to is chosen, as a click does.
   */
  function onTabKey(e: React.KeyboardEvent) {
    const open = TABS.filter((p) => p.bookable);
    const at = open.findIndex((p) => p.key === product.key);
    const next =
      e.key === "ArrowRight"
        ? open[(at + 1) % open.length]
        : e.key === "ArrowLeft"
          ? open[(at - 1 + open.length) % open.length]
          : e.key === "Home"
            ? open[0]
            : e.key === "End"
              ? open[open.length - 1]
              : undefined;
    if (!next) return;
    e.preventDefault();
    setProduct(next.key);
    document.getElementById(tabId(next.key))?.focus();
  }

  return (
    // No overflow clip on the card: the place fields open a suggestion list
    // below themselves that must be free to hang past its bottom edge.
    <div className="rounded-card bg-white text-body shadow-panel sm:rounded-panel">
      {/* On a phone the tabs scroll sideways, a shadow at the side that
          hides more; the chosen tab is the one Tab reaches, the arrows
          the rest. */}
      <div
        role="tablist"
        aria-label="Choose a travel service"
        onKeyDown={onTabKey}
        className="scroll-shade-x flex snap-x snap-mandatory overflow-x-auto rounded-t-[inherit] border-b border-card-edge [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-6"
      >
        {TABS.map((p) => {
          const on = p.key === product.key;
          const soonId = `svc-soon-${p.key}`;
          return (
            <button
              key={p.key}
              type="button"
              role="tab"
              id={tabId(p.key)}
              aria-selected={on}
              aria-controls="svc-panel"
              tabIndex={on ? 0 : -1}
              disabled={!p.bookable}
              title={p.bookable ? undefined : "Coming soon"}
              aria-describedby={p.bookable ? undefined : soonId}
              onClick={() => setProduct(p.key)}
              // Its ring drawn inside: the strip scrolls on a phone, and clips.
              className={`relative flex min-h-[54px] shrink-0 snap-start items-center justify-center gap-2.5 border-r border-hairline px-4 py-3 text-caption font-semibold whitespace-nowrap last:border-r-0 focus-ring-inset disabled:cursor-not-allowed disabled:text-muted/60 sm:text-copy lg:min-h-[58px] ${
                on ? "bg-brand-tint text-brand" : "enabled:hover:bg-hover"
              }`}
            >
              <ProductIcon
                service={p.key}
                className="h-5 w-5 shrink-0 stroke-[1.8]"
              />
              <span>{p.label}</span>
              {!p.bookable && (
                // Out of the flow, so it never widens the tab past its
                // column; read after the tab's name, as its description.
                <span
                  id={soonId}
                  aria-hidden
                  className="absolute top-1.5 right-2 text-caps leading-none font-bold text-brand"
                >
                  Soon
                </span>
              )}
              {on && (
                <span
                  aria-hidden
                  className="absolute bottom-0 h-[3px] w-[50px] rounded-sm bg-azure"
                />
              )}
            </button>
          );
        })}
      </div>

      <div id="svc-panel" role="tabpanel" aria-labelledby={tabId(product.key)}>
        <form onSubmit={submit} noValidate className="px-3.5 py-[18px] sm:p-6">
          {category ? (
            <TripsPanel
              planner={planner}
              category={category}
              presetsOf={presetsOf}
              near={near}
              summary={
                passengers === 1 ? "1 passenger" : `${passengers} passengers`
              }
              passengers={
                <PassengersStepper
                  value={passengers}
                  onChange={setPassengers}
                  className="w-full @3xl:w-[250px]"
                />
              }
              action={
                // As tall as the fields beside it.
                <Button
                  type="submit"
                  size="lg"
                  pending={pending}
                  className="h-14 w-full @3xl:w-auto @3xl:min-w-[230px]"
                >
                  {pending ? (
                    "Finding prices…"
                  ) : (
                    <>
                      {planner.count > 1
                        ? `Get prices · ${planner.count} trips`
                        : product.cta}{" "}
                      <span aria-hidden>&nbsp;→</span>
                    </>
                  )}
                </Button>
              }
              className={clearOfHeader}
            />
          ) : null}
        </form>
      </div>
      {newBooking.dialog}
    </div>
  );
}
