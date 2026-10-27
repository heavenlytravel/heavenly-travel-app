"use client";

import Link from "next/link";
import { maskEmail } from "@repo/db";
import {
  eyebrow,
  PageTitle,
  Panel,
  primaryButton,
  Stop,
  textLink,
} from "../../_components/Page";
import { STEP_PATHS } from "./situations";
import { classOf } from "./data";
import { ACCOUNT, update, useExample } from "./store";
import { useHydrated } from "./ui";

/**
 * Step 4, a visitor's landing after confirming, as the site has it today:
 * the reference and where the email went. What changes is the promise:
 * each trip is confirmed on its own, and an account is where a single
 * trip can be cancelled.
 */
export function ReceivedStep() {
  const hydrated = useHydrated();
  const { booking } = useExample();
  if (!hydrated) return null;
  if (!booking) {
    return (
      <Stop
        title="No booking yet"
        message="Confirm an itinerary, or open a situation, to see this page."
        href="/booking-example"
        linkLabel="See the situations"
      />
    );
  }
  const count = booking.trips.length;

  return (
    <>
      <PageTitle eyebrow="Booking" title="Request received.">
        We will check every trip and confirm each one by email shortly.
      </PageTitle>
      <Panel className="max-w-[560px]">
        <p className={eyebrow}>Your reference</p>
        <p className="mt-2 font-(family-name:--font-display) text-[clamp(2.4rem,6vw,3.6rem)] leading-none">
          {booking.reference}
        </p>
        <p className="mt-5 text-slate-700">
          {count === 1 ? "One trip" : `${count} trips`} in one{" "}
          {classOf(booking.vehicle.classId).name}. We have emailed the details
          to{" "}
          <strong className="font-semibold">
            {maskEmail(booking.contact.email)}
          </strong>
          . Keep this reference and quote it when you contact us.
        </p>
        <p className="mt-4 text-[0.9rem] text-slate-500">
          Verify your email once to see updates and cancel a trip online.{" "}
          <Link
            href={STEP_PATHS.booking}
            onClick={() =>
              update((s) => ({
                ...s,
                signedIn: true,
                contact: ACCOUNT,
                booking: s.booking && { ...s.booking, guest: false },
              }))
            }
            className={textLink}
          >
            Create an account
          </Link>
        </p>
        <Link
          href="/booking-example"
          className={`${primaryButton} mt-6 w-full`}
        >
          Back to Heavenly Travel
        </Link>
      </Panel>
    </>
  );
}
