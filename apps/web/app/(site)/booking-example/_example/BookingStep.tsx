"use client";

import { CONTACT } from "@repo/db";
import { useConfirm } from "@repo/ui/alert-dialog";
import { toast } from "@repo/ui/toast";
import { PageTitle, panel, Rows, Stop, textLink } from "../../_components/Page";
import { StatusBadge } from "../../booking/_components/StatusBadge";
import { classOf, dayLabel, momentLabel, rm } from "./data";
import {
  cutoffOf,
  priceOf,
  totalOf,
  update,
  useExample,
  type Booking,
  type Trip,
} from "./store";
import {
  byDay,
  DayHeading,
  ItemBadge,
  LateNightLine,
  TripExtras,
  TripHead,
  TripNote,
  tripPriceLabel,
  useHydrated,
  VehicleSummary,
} from "./ui";

/** The booking's status from its trips', as the database rolls it up. */
function bookingStatus(booking: Booking) {
  const { trips } = booking;
  if (trips.every((t) => t.status === "cancelled")) return "cancelled";
  const live = trips.filter((t) => t.status !== "cancelled");
  if (live.every((t) => t.status === "completed")) return "completed";
  if (live.some((t) => t.status === "received")) return "received";
  return "confirmed";
}

/**
 * Step 5, the booking in the customer's account. The vehicle once, then
 * the trips by day as on the confirm page, each with its own status and,
 * until its own cancellation time, its own Cancel. A trip we cancelled
 * says why. A sample booking mid-trip pretends it is the moment it shows
 * at the top.
 */
export function BookingStep() {
  const hydrated = useHydrated();
  const { booking } = useExample();
  const [dialog, confirm] = useConfirm();
  if (!hydrated) return null;
  if (!booking) {
    return (
      <Stop
        title="No booking yet"
        message="Confirm a booking, or open a situation, to see it here."
        href="/booking-example"
        linkLabel="See the situations"
      />
    );
  }

  const { vehicle } = booking;
  const now = booking.seenAt ? new Date(booking.seenAt) : new Date();
  const cancelled = booking.trips.filter((t) => t.status === "cancelled");
  const cancellable = (trip: Trip) =>
    (trip.status === "received" || trip.status === "confirmed") &&
    now < cutoffOf(trip, vehicle.classId);

  async function cancel(trip: Trip) {
    const yes = await confirm({
      title: `Cancel the trip on ${dayLabel(trip.date)} at ${trip.time}?`,
      description:
        "The rest of your booking stays as it is. You cannot undo this.",
      action: "Cancel this trip",
      cancel: "Keep it",
      danger: true,
    });
    if (!yes) return;
    update((s) => ({
      ...s,
      booking: s.booking && {
        ...s.booking,
        trips: s.booking.trips.map((t) =>
          t.id === trip.id
            ? { ...t, status: "cancelled", cancelledBy: "customer" }
            : t,
        ),
      },
    }));
    toast.success(`Trip on ${dayLabel(trip.date)} cancelled`);
  }

  return (
    <>
      {booking.seenAt ? (
        <p className="mb-4 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[0.85rem] text-slate-600">
          As if it were {momentLabel(now)}
        </p>
      ) : null}
      <PageTitle eyebrow={`Booking ${booking.reference}`} title="Your booking.">
        Each trip is confirmed, and can be cancelled, on its own.
      </PageTitle>

      <div className="grid gap-7 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div>
          <section className={`${panel} mb-7`}>
            <VehicleSummary
              vehicle={vehicle}
              tripCount={booking.trips.length}
            />
          </section>
          {byDay(booking.trips).map((day) => (
            <section key={day.date} className="mb-7">
              <DayHeading
                date={day.date}
                number={day.number}
                amount={rm(totalOf(day.trips, vehicle.classId))}
              />
              <div className="grid gap-3">
                {day.trips.map((trip) => (
                  <article
                    key={trip.id}
                    className={`rounded-[16px] border border-slate-100 bg-white pb-4 shadow-[0_10px_30px_rgba(0,38,75,0.07)] ${
                      trip.status === "cancelled" ? "opacity-75" : ""
                    }`}
                  >
                    <div className="px-[22px] pt-5">
                      <TripHead
                        trip={trip}
                        category={vehicle.category}
                        price={tripPriceLabel(
                          priceOf(trip, vehicle.classId),
                          trip.status === "cancelled",
                        )}
                      />
                    </div>
                    {trip.status !== "cancelled" ? (
                      <LateNightLine trip={trip} classId={vehicle.classId} />
                    ) : null}
                    <TripExtras trip={trip} />
                    {trip.cancelNote ? (
                      <TripNote tone="amber">{trip.cancelNote}</TripNote>
                    ) : null}
                    <footer className="mx-[22px] mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[0.88rem]">
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {trip.status ? (
                          <ItemBadge status={trip.status} />
                        ) : null}
                        <span className="text-slate-500">
                          <TripState
                            trip={trip}
                            classId={vehicle.classId}
                            now={now}
                          />
                        </span>
                      </span>
                      {cancellable(trip) ? (
                        <button
                          type="button"
                          onClick={() => cancel(trip)}
                          className="font-semibold text-[#b3261e] hover:underline"
                        >
                          Cancel this trip
                        </button>
                      ) : null}
                    </footer>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className={`${panel} lg:sticky lg:top-24`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-(family-name:--font-display) text-[1.5rem]">
              Summary
            </h2>
            <StatusBadge status={bookingStatus(booking)} />
          </div>
          <Rows
            rows={[
              ["Vehicle", classOf(vehicle.classId).name],
              ["Trips booked", String(booking.trips.length)],
              [
                "Cancelled",
                cancelled.length === 0
                  ? "None"
                  : `${cancelled.length} · ${rm(
                      cancelled.reduce(
                        (n, t) => n + (priceOf(t, vehicle.classId) ?? 0),
                        0,
                      ),
                    )}`,
              ],
            ]}
          />
          <div className="mt-2 flex items-baseline justify-between border-t border-slate-200 pt-3">
            <span className="font-semibold text-slate-700">Total</span>
            <span className="text-[1.7rem] font-bold text-brand">
              {rm(totalOf(booking.trips, vehicle.classId))}
            </span>
          </div>
          <h3 className="mt-6 mb-1 font-(family-name:--font-display) text-[1.25rem]">
            Contact
          </h3>
          <Rows
            rows={[
              ["Name", booking.contact.name],
              ["Phone", booking.contact.phone],
              ["Email", booking.contact.email],
            ]}
          />
          <p className="mt-4 text-[0.9rem] text-slate-500">
            Need to change a trip or the vehicle?{" "}
            <a
              href={CONTACT.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={textLink}
            >
              WhatsApp us
            </a>
          </p>
        </section>
      </div>
      {dialog}
    </>
  );
}

/** Beside a trip's status: until when it can be cancelled, or why it no longer can. */
function TripState({
  trip,
  classId,
  now,
}: {
  trip: Trip;
  classId: string;
  now: Date;
}) {
  const cutoff = cutoffOf(trip, classId);
  if (trip.status === "cancelled") {
    return trip.cancelledBy === "admin" ? "by Heavenly Travel" : "by you";
  }
  if (trip.status === "completed") return null;
  return now < cutoff
    ? `Free cancellation until ${momentLabel(cutoff)}`
    : `Cancellation closed on ${momentLabel(cutoff)}`;
}
