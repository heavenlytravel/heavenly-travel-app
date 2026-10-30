import type { Metadata } from "next";
import Link from "next/link";
import { isMaskedEmail, isReference, normalizeReference } from "@repo/db";
import { Button } from "@repo/ui/button";
import { notFound } from "next/navigation";
import { eyebrow, PageTitle, Panel } from "../../../_components/Page";
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
        We will check your booking and confirm it by email shortly.
      </PageTitle>
      <Panel className="max-w-[560px]">
        <p className={eyebrow}>Your reference</p>
        <p className="mt-2 font-serif text-display leading-none">{reference}</p>
        <p className="mt-5 text-body">
          {sentTo ? (
            <>
              We have emailed the details to{" "}
              <strong className="font-semibold">{sentTo}</strong>. Keep this
              reference and quote it when you contact us about your booking.
            </>
          ) : (
            "We have emailed you the details. Keep this reference and quote it when you contact us about your booking."
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
