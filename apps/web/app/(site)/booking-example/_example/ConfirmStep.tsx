"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CONTACT_NAME_MAX_LENGTH,
  TRIP_CATEGORY_LABELS,
  TRIP_MAX_FLIGHT_NUMBER_LENGTH,
  TRIP_MAX_NOTES_LENGTH,
} from "@repo/db";
import { BedIcon, FileTextIcon } from "@repo/ui/icons";
import { ProductIcon } from "../../../_components/Brand";
import {
  control,
  PageTitle,
  panel,
  primaryButton,
  Stop,
  textLink,
} from "../../_components/Page";
import { classOf, dayLabel, isAirport, rm, shortDay, shortPlace } from "./data";
import { TripTimeline, type TripNote } from "./search/Planner";
import { STEP_PATHS } from "./situations";
import {
  ACCOUNT,
  blockOf,
  newReference,
  priceOf,
  rowsOf,
  totalOf,
  update,
  useExample,
  type ForDriver,
  type Trip,
} from "./store";
import { Dock, tripPriceLabel, useHydrated, VehicleSummary } from "./ui";

const isPickupAt = (trip: Trip) => isAirport(trip.from);
const isDropoffAt = (trip: Trip) =>
  trip.mode === "oneway" && isAirport(trip.to);

/**
 * Step 3, today's confirm page for several trips. On the left the trips,
 * listed as on the vehicle page and priced with today's rates, then the
 * booking's one vehicle and its total; on the right the details form, which
 * stays in view. The trips are not changed here: "Edit trips" goes back to
 * the vehicle page, where they are changed or added to. A trip that cannot
 * be booked as it is says so in the list: its vehicle is gone that day, it
 * is too soon, or it starts before the one before it ends, which one
 * vehicle cannot do. The form asks the contact, the flights for the
 * pick-ups and drop-offs at an airport, and a note for the drivers, once
 * for the booking. The confirm button says which trip to fix, and nothing
 * typed is lost.
 */
export function ConfirmStep() {
  const hydrated = useHydrated();
  const state = useExample();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (!hydrated) return null;

  const { trips, vehicle, contact, forDriver, signedIn } = state;
  const classId = vehicle.classId;

  function search() {
    update((s) => ({ ...s, search: rowsOf([]), editing: null }));
    router.push(STEP_PATHS.search);
  }

  if (trips.length === 0) {
    return (
      <>
        <PageTitle eyebrow="Booking" title="Confirm your booking." />
        <section className={`${panel} max-w-[560px]`}>
          <h2 className="font-(family-name:--font-display) text-[1.7rem] leading-tight">
            Nothing here yet
          </h2>
          <p className="mt-2 text-slate-700">
            Search for a trip. Add as many as your stay needs, one vehicle does
            them all, then book them together.
          </p>
          <button
            type="button"
            onClick={search}
            className={`${primaryButton} mt-6`}
          >
            Search for a trip
          </button>
        </section>
      </>
    );
  }
  if (!classId) {
    return (
      <Stop
        title="Choose a vehicle first"
        message="One vehicle does every trip. Choose it, and your trips show here, priced."
        href={STEP_PATHS.vehicle}
        linkLabel="Choose a vehicle"
      />
    );
  }

  const cls = classOf(classId);
  const total = totalOf(trips, classId);
  const quotes = trips.filter((t) => t.issue === "quote").length;
  const arriving = trips.filter(isPickupAt);
  const departing = trips.filter(isDropoffAt);
  const tripOf = (id: string) => trips.find((t) => t.id === id);

  /** What a trip says for itself in the list; the list says a clash itself. */
  function noteOf(id: string): TripNote | null {
    const trip = tripOf(id);
    if (!trip || !classId) return null;
    if (blockOf(trip, trips) === "notice") {
      return {
        tone: "red",
        text: "Less than 24 hours away, too soon to book online. Choose a later time, or WhatsApp us.",
      };
    }
    if (trip.issue === "quote") {
      return {
        tone: "blue",
        text: "Outside our areas: we email you a quote for it, and book the rest at these prices.",
      };
    }
    if (trip.issue === "overnight") {
      return {
        tone: "amber",
        text: `Your driver stays the night in ${shortPlace(trip.from)} first. We add the room and meals when we confirm.`,
      };
    }
    const now = priceOf(trip, classId);
    if (trip.wasPrice !== undefined && now !== null) {
      return {
        tone: "blue",
        text: `Now ${rm(now)}, up from ${rm(trip.wasPrice)} when you added it: your booking shows today's rates.`,
      };
    }
    return null;
  }

  function setContact(field: keyof typeof contact, value: string) {
    update((s) => ({ ...s, contact: { ...s.contact, [field]: value } }));
    clearError(field);
  }

  function setForDriver(field: keyof ForDriver, value: string) {
    update((s) => ({ ...s, forDriver: { ...s.forDriver, [field]: value } }));
  }

  function clearError(field: string) {
    if (!errors[field]) return;
    const next = { ...errors };
    delete next[field];
    setErrors(next);
  }

  function confirm(e: React.FormEvent) {
    e.preventDefault();
    const found: Record<string, string> = {};
    if (!contact.name.trim())
      found.name = "Enter the name your driver will ask for.";
    if (!/^\+?[\d\s-]{8,}$/.test(contact.phone.trim())) {
      found.phone =
        "Enter a phone number your driver can reach, like +60 12 345 6789.";
    }
    if (!/^\S+@\S+\.\S+$/.test(contact.email.trim())) {
      found.email = "Enter an email address, like name@example.com.";
    }
    const blocked = trips.filter((t) => blockOf(t, trips));
    if (blocked.length > 0) {
      found.trips = `Change or remove the ${
        blocked.length === 1 ? "trip" : "trips"
      } marked in red (${blocked
        .map((t) => `${dayLabel(t.date)}, ${t.time}`)
        .join("; ")}), then confirm.`;
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    update((s) => ({
      ...s,
      trips: [],
      vehicle: { ...s.vehicle, classId: null },
      search: rowsOf([]),
      forDriver: { arrivingFlight: "", departingFlight: "", notes: "" },
      booking: {
        reference: newReference(),
        // Each trip is one booking item: the flights and the note go on
        // the trips they are for.
        trips: s.trips.map((t) => ({
          ...t,
          flight: isPickupAt(t)
            ? s.forDriver.arrivingFlight
            : isDropoffAt(t)
              ? s.forDriver.departingFlight
              : "",
          notes: s.forDriver.notes,
          status: "received",
        })),
        vehicle: { ...s.vehicle, classId: cls.id },
        contact: s.contact,
        guest: !s.signedIn,
        seenAt: null,
      },
    }));
    router.push(signedIn ? STEP_PATHS.booking : STEP_PATHS.received);
  }

  const first = trips[0]!;
  const last = trips[trips.length - 1]!;
  const where = (list: Trip[], at: (t: Trip) => string) =>
    `${shortPlace(at(list[0]!))} on ${dayLabel(list[0]!.date)}${
      list.length > 1 ? `, and ${list.length - 1} more` : ""
    }`;

  const tripsPanel = (
    <section className={panel}>
      <TripTimeline
        rows={rowsOf(trips)}
        className=""
        action={
          <Link
            href={STEP_PATHS.vehicle}
            className={`text-[0.92rem] ${textLink}`}
          >
            Edit trips
          </Link>
        }
        priceOf={(row) => {
          const trip = tripOf(row.id);
          return trip ? tripPriceLabel(priceOf(trip, cls.id)) : null;
        }}
        noteOf={(row) => noteOf(row.id)}
      />
    </section>
  );

  const vehiclePanel = (
    <section className={`${panel} grid gap-5`}>
      <h2 className="font-(family-name:--font-display) text-[1.5rem] leading-tight">
        Your vehicle
      </h2>
      <VehicleSummary
        vehicle={{ ...vehicle, classId }}
        tripCount={trips.length}
        action={
          <Link
            href={STEP_PATHS.vehicle}
            className={`text-[0.92rem] ${textLink}`}
          >
            Change
          </Link>
        }
      />
      <div className="border-t border-slate-200 pt-4">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-semibold text-slate-700">
            {trips.length === 1 ? "1 trip" : `${trips.length} trips`} in the{" "}
            {cls.name}
          </span>
          <span className="text-[1.7rem] font-bold text-brand">
            {rm(total)}
          </span>
        </div>
        {quotes > 0 ? (
          <p className="mt-1 text-[0.88rem] text-slate-600">
            Plus {quotes === 1 ? "1 trip" : `${quotes} trips`} we quote by
            email.
          </p>
        ) : null}
        <p className="mt-2 text-[0.88rem] text-emerald-800">
          Free cancellation until {cls.cutoffHours} hours before each trip, each
          on its own.
        </p>
        <p className="mt-1 text-[0.85rem] text-slate-500">
          Pay nothing now. We confirm each trip by email.
        </p>
      </div>
      <div className="grid gap-2 border-t border-slate-200 pt-4">
        <p className="text-[0.85rem] font-semibold text-slate-500">
          Coming soon to your booking
        </p>
        <Soon icon={<BedIcon className="size-5" />}>
          A hotel for {shortDay(first.date)} to {shortDay(last.date)}
        </Soon>
        <Soon icon={<ProductIcon service="attraction" className="size-5" />}>
          Attraction tickets, on the days you are there
        </Soon>
        <Soon icon={<FileTextIcon className="size-5" />}>
          Paste your itinerary, and we find the trips in it
        </Soon>
      </div>
    </section>
  );

  const detailsPanel = (
    <section id="contact" className={`${panel} scroll-mt-28`}>
      <h2 className="mb-3 font-(family-name:--font-display) text-[1.5rem]">
        Your details
      </h2>
      <form onSubmit={confirm} noValidate className="grid gap-4">
        {!signedIn ? (
          <p className="text-[0.9rem] text-slate-500">
            Have an account?{" "}
            <button
              type="button"
              onClick={() =>
                update((s) => ({ ...s, signedIn: true, contact: ACCOUNT }))
              }
              className={textLink}
            >
              Sign in
            </button>
          </p>
        ) : null}
        <Field label="Name for the driver" error={errors.name}>
          <input
            value={contact.name}
            maxLength={CONTACT_NAME_MAX_LENGTH}
            onChange={(e) => setContact("name", e.target.value)}
            aria-invalid={Boolean(errors.name)}
            autoComplete="name"
            className={control}
          />
        </Field>
        <Field
          label="Phone number"
          error={errors.phone}
          hint="Your drivers will reach you on WhatsApp or by call."
        >
          <input
            type="tel"
            value={contact.phone}
            onChange={(e) => setContact("phone", e.target.value)}
            aria-invalid={Boolean(errors.phone)}
            placeholder="+60 12 345 6789"
            autoComplete="tel"
            className={control}
          />
        </Field>
        <Field
          label="Email"
          error={errors.email}
          hint={
            signedIn
              ? "From your account. Your booking emails go here."
              : "We need your email to send your booking confirmation."
          }
        >
          <input
            type="email"
            value={contact.email}
            readOnly={signedIn}
            onChange={(e) => setContact("email", e.target.value)}
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
            className={`${control} ${signedIn ? "bg-mist text-slate-700" : ""}`}
          />
        </Field>
        {arriving.length > 0 ? (
          <Field
            label="Arriving flight"
            hint={`For the pick-up at ${where(arriving, (t) => t.from)}. Your driver follows it, and waits if it lands late.`}
          >
            <input
              value={forDriver.arrivingFlight}
              maxLength={TRIP_MAX_FLIGHT_NUMBER_LENGTH}
              onChange={(e) =>
                setForDriver("arrivingFlight", e.target.value.toUpperCase())
              }
              placeholder="MH 1234"
              className={`${control} uppercase`}
            />
          </Field>
        ) : null}
        {departing.length > 0 ? (
          <Field
            label="Departing flight"
            hint={`For the drop-off at ${where(departing, (t) => t.to)}, so your driver leaves time for check-in.`}
          >
            <input
              value={forDriver.departingFlight}
              maxLength={TRIP_MAX_FLIGHT_NUMBER_LENGTH}
              onChange={(e) =>
                setForDriver("departingFlight", e.target.value.toUpperCase())
              }
              placeholder="AK 6305"
              className={`${control} uppercase`}
            />
          </Field>
        ) : null}
        <Field
          label="Notes for the driver"
          hint="Optional. Every driver on this booking sees it."
        >
          <textarea
            value={forDriver.notes}
            maxLength={TRIP_MAX_NOTES_LENGTH}
            onChange={(e) => setForDriver("notes", e.target.value)}
            placeholder="Luggage, a child seat, a meeting point"
            rows={3}
            className={control}
          />
        </Field>
        {errors.trips ? (
          <p role="alert" className="text-[0.95rem] text-[#b3261e]">
            {errors.trips}
          </p>
        ) : null}
        <button type="submit" className={primaryButton}>
          Confirm booking · {rm(total)}
        </button>
        <p className="text-[0.85rem] text-slate-500">
          You can cancel any trip on its own, until its own cancellation time.
        </p>
      </form>
    </section>
  );

  return (
    <>
      <PageTitle
        eyebrow={`${TRIP_CATEGORY_LABELS[vehicle.category]} · ${
          trips.length === 1 ? "1 trip" : `${trips.length} trips`
        }`}
        title="Confirm your booking."
      >
        Every trip is priced with today&apos;s rates. Nothing is booked until
        you confirm, and you pay nothing now.
      </PageTitle>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-7 pb-24 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:pb-0">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-7">
          {tripsPanel}
          {vehiclePanel}
        </div>
        {/* In view while the left side scrolls; scrolls itself when taller than the screen. */}
        <div className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:rounded-[18px]">
          {detailsPanel}
        </div>
      </div>

      <Dock>
        <span className="min-w-0 flex-1">
          <b className="block text-[1.2rem] leading-tight text-brand">
            {rm(total)}
          </b>
          <span className="text-[0.8rem] text-slate-500">
            {cls.name} ·{" "}
            {trips.length === 1 ? "1 trip" : `${trips.length} trips`}
          </span>
        </span>
        <a href="#contact" className={`${primaryButton} min-h-[48px] px-4`}>
          Continue
        </a>
      </Dock>
    </>
  );
}

/** Something the booking will hold later, where it will sit. */
function Soon({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border-[1.5px] border-dashed border-[#c5d3e2] px-3 py-2.5 text-[0.9rem] text-slate-500">
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-slate-100 text-slate-400">
        {icon}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
      <span className="text-[0.6rem] font-bold tracking-[0.12em] text-azure uppercase">
        Soon
      </span>
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.9rem] font-semibold text-slate-800">
        {label}
      </span>
      {children}
      {error ? (
        <span
          role="alert"
          className="mt-1.5 block text-[0.85rem] text-[#b3261e]"
        >
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-[0.85rem] text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
