"use client";

import { PRODUCTS, type Product } from "../../_lib/search";
import {
  bookableCategory,
  tripBookingPath,
} from "../../_lib/transportation-booking";
import { useNavigate } from "../../_lib/useNavigate";
import { Pending } from "../../(site)/_components/Page";
import { ProductIcon } from "../Brand";
import { PassengersStepper } from "../trips/PassengersStepper";
import { TripForm } from "../trips/TripForm";
import { TripTimeline } from "../trips/TripTimeline";
import { useNewBooking } from "../trips/useNewBooking";
import { useSearchCard } from "./SearchProvider";

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-azure";

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
 * Six services as a row of icon tabs, then the trip planner: the kind of
 * trip as two radios, the places, the hours of a hire and when, in one
 * joined row. Car with driver and coach charter can be sent; the other
 * tabs are disabled until their flows exist. One trip is typed and priced
 * as before; "Add trip" puts it in "Your trips" above, by date, and
 * empties the row for the next, and choosing a trip of the list opens it
 * in the row to change. The group's size is asked once, beside the
 * button, for the one vehicle that does every trip. "Get prices" sends
 * the list with the trip in the row, when one is typed, to the vehicle
 * page of the category, asking first when it would replace trips the
 * customer already has; the button says so while that page opens. Its
 * state is the `SearchProvider`'s above it, which is how a card elsewhere
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

  return (
    // No overflow clip on the card: the place fields open a suggestion list
    // below themselves that must be free to hang past its bottom edge.
    <div className="rounded-[18px] bg-white text-slate-900 shadow-[0_22px_55px_rgba(0,38,75,0.16)] sm:rounded-[22px]">
      <div
        role="tablist"
        aria-label="Choose a travel service"
        className="flex snap-x snap-mandatory overflow-x-auto rounded-t-[inherit] border-b border-slate-200 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-6"
      >
        {TABS.map((p) => {
          const on = p.key === product.key;
          return (
            <button
              key={p.key}
              type="button"
              role="tab"
              id={`svc-tab-${p.key}`}
              aria-selected={on}
              aria-controls="svc-panel"
              disabled={!p.bookable}
              title={p.bookable ? undefined : "Coming soon"}
              onClick={() => setProduct(p.key)}
              className={`relative flex min-h-[54px] shrink-0 snap-start items-center justify-center gap-2.5 border-r border-slate-100 px-4 py-3 text-[0.83rem] font-semibold whitespace-nowrap last:border-r-0 disabled:cursor-not-allowed disabled:text-slate-500/60 sm:text-[0.95rem] lg:min-h-[58px] ${
                on
                  ? "bg-brand-tint text-brand"
                  : "bg-white enabled:hover:bg-slate-50"
              } ${focus}`}
            >
              <ProductIcon
                service={p.key}
                className="h-5 w-5 shrink-0 stroke-[1.8]"
              />
              <span>{p.label}</span>
              {!p.bookable && (
                // Out of the flow, so it never widens the tab past its column.
                <span className="absolute top-1.5 right-2 text-[0.55rem] leading-none font-bold tracking-[0.12em] text-azure uppercase">
                  Soon
                </span>
              )}
              {on && (
                <span
                  aria-hidden
                  className="absolute bottom-0 h-[3px] w-[50px] rounded-[3px] bg-azure"
                />
              )}
            </button>
          );
        })}
      </div>

      <form
        id="svc-panel"
        role="tabpanel"
        aria-labelledby={`svc-tab-${product.key}`}
        onSubmit={submit}
        noValidate
        className="px-3.5 py-[18px] sm:p-6"
      >
        {category ? (
          <>
            {planner.trips.length > 0 ? (
              <TripTimeline
                trips={planner.trips}
                open={planner.editing}
                onPick={planner.open}
              />
            ) : null}
            <TripForm
              planner={planner}
              category={category}
              presetsOf={presetsOf}
              near={near}
            >
              <span className="hidden flex-1 lg:block" />
              <PassengersStepper value={passengers} onChange={setPassengers} />
              <button
                type="submit"
                disabled={pending}
                className={`flex min-h-[56px] w-full items-center justify-center rounded-[14px] bg-brand px-5 text-[1.02rem] font-bold whitespace-nowrap text-white shadow-[0_8px_20px_rgba(4,107,210,0.18)] hover:bg-brand-strong disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:min-w-[230px] ${focus}`}
              >
                {pending ? (
                  <Pending>Finding prices…</Pending>
                ) : (
                  <>
                    {planner.count > 1
                      ? `Get prices · ${planner.count} trips`
                      : product.cta}{" "}
                    &nbsp;→
                  </>
                )}
              </button>
            </TripForm>
          </>
        ) : null}
      </form>
      {newBooking.dialog}
    </div>
  );
}
