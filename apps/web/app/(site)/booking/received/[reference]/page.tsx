import type { Metadata } from "next";
import Link from "next/link";
import { isMaskedEmail, isReference, normalizeReference } from "@repo/db";
import { notFound } from "next/navigation";
import {
  eyebrow,
  PageTitle,
  Panel,
  primaryButton,
  textLink,
} from "../../../_components/Page";
import { accountBookingHref, signUpHref } from "../../../../_lib/routes";

export const metadata: Metadata = {
  title: "Request received | Heavenly Travel",
  robots: { index: false },
};

/**
 * Route: /booking/received/HT-7K3QZM?to=a***@gmail.com
 * Where a guest lands after booking: the reference in large type and where
 * the emails went. It shows no trip and reads nothing from the database, so
 * it leaks nothing to anyone who guesses a reference and survives a
 * refresh. Both parts of the URL are shown only in the shape the action
 * makes them, so a crafted link cannot put other words on the page. The
 * guest reads the booking in the emails; an account, offered once here, is
 * where updates and cancelling live. See docs/261008-guest-booking.md,
 * "After the booking".
 */
export default async function ReceivedPage({
  params,
  searchParams,
}: PageProps<"/booking/received/[reference]">) {
  const reference = normalizeReference((await params).reference);
  if (!isReference(reference)) notFound();
  const { to } = await searchParams;
  const sentTo = isMaskedEmail(to) ? to : null;

  return (
    <>
      <PageTitle eyebrow="Booking" title="Request received.">
        We will check the trip and confirm it by email shortly.
      </PageTitle>
      <Panel className="max-w-[560px]">
        <p className={eyebrow}>Your reference</p>
        <p className="mt-2 font-(family-name:--font-display) text-[clamp(2.4rem,6vw,3.6rem)] leading-none">
          {reference}
        </p>
        <p className="mt-5 text-[#324844]">
          {sentTo ? (
            <>
              We have emailed the details to{" "}
              <strong className="font-semibold">{sentTo}</strong>. Keep this
              reference and quote it when you contact us about the trip.
            </>
          ) : (
            "We have emailed you the details. Keep this reference and quote it when you contact us about the trip."
          )}
        </p>
        <p className="mt-4 text-[0.9rem] text-[#67726f]">
          Verify your email once to see updates and cancel online.{" "}
          <Link
            href={signUpHref(null, accountBookingHref(reference))}
            className={textLink}
          >
            Create an account
          </Link>
        </p>
        <Link href="/" className={`${primaryButton} mt-6 w-full`}>
          Back to Heavenly Travel
        </Link>
      </Panel>
    </>
  );
}
