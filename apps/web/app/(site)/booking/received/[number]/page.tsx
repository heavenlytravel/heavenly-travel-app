import type { Metadata } from "next";
import Link from "next/link";
import {
  bookingRefOfPath,
  EMAILS_ON,
  formatDocumentNumber,
  isMaskedEmail,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { notFound } from "next/navigation";
import { eyebrow, PageTitle, Panel } from "../../../_components/Page";
import { accountBookingHref, signUpHref } from "../../../../_lib/routes";

export const metadata: Metadata = {
  title: "Request received | Heavenly Travel",
  robots: { index: false },
};

/**
 * Route: /booking/received/HTB-1042?to=a***@gmail.com
 * Where a guest lands after booking: the booking number in large type and where
 * the emails went, while they are on (`EMAILS_ON`). It shows no trip and reads nothing from the database, so
 * it leaks nothing to anyone who guesses a number and survives a
 * refresh. Both parts of the URL are shown only in the shape the action
 * makes them, so a crafted link cannot put other words on the page. The
 * guest reads the booking in the emails; an account, offered once here, is
 * where updates and cancelling live. See docs/261008-guest-booking.md,
 * "After the booking".
 */
export default async function ReceivedPage({
  params,
  searchParams,
}: PageProps<"/booking/received/[number]">) {
  const ref = bookingRefOfPath((await params).number);
  if (ref === null) notFound();
  // Decoded once: the path parsed already.
  const reference = formatDocumentNumber(ref.kind, ref.number);
  const { to } = await searchParams;
  const sentTo = isMaskedEmail(to) ? to : null;

  return (
    <>
      <PageTitle eyebrow="Booking" title="Request received.">
        {EMAILS_ON
          ? "We will check your booking and confirm it by email shortly."
          : "We will check your booking and contact you to confirm it shortly."}
      </PageTitle>
      <Panel className="max-w-[560px]">
        <p className={eyebrow}>Your booking number</p>
        <p className="mt-2 font-serif text-display leading-none">{reference}</p>
        <p className="mt-5 text-body">
          {!EMAILS_ON ? (
            "Keep this number and quote it when you contact us about your booking."
          ) : sentTo ? (
            <>
              We have emailed the details to{" "}
              <strong className="font-semibold">{sentTo}</strong>. Keep this
              number and quote it when you contact us about your booking.
            </>
          ) : (
            "We have emailed you the details. Keep this number and quote it when you contact us about your booking."
          )}
        </p>
        <p className="mt-4 text-copy text-muted">
          Verify your email once to see updates and cancel online.{" "}
          <Link
            href={signUpHref(null, accountBookingHref(reference))}
            className="text-link"
          >
            Create an account
          </Link>
        </p>
        <Button asChild size="lg" className="mt-6 w-full">
          <Link href="/">Back to Heavenly Travel</Link>
        </Button>
      </Panel>
    </>
  );
}
