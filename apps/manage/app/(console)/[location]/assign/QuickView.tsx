"use client";

import { Button } from "@repo/ui/button";
import { Dialog } from "@repo/ui/dialog";
import { Rows } from "@repo/ui/rows";
import { Loading } from "@repo/ui/skeleton";
import { RowsSkeleton } from "@repo/console/Skeleton";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import {
  loadBookingQuickView,
  type BookingQuickView,
} from "./quick-view-actions";

/**
 * A booking's number under Assign (`bookingLabelOf`), as a link that opens the booking at
 * a glance in a dialog, at once, its lines drawn while it is read (the
 * customer, each trip, the total), without leaving the page; "Open
 * booking" goes to its page.
 */
export function QuickViewButton({
  bookingId,
  label,
  href,
}: {
  bookingId: string;
  /** How the booking is named: its number, HTB-1042. */
  label: string;
  /** The booking's page, in the scope the Assign page is in. */
  href: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<BookingQuickView | null>(null);
  const [failed, setFailed] = useState(false);
  const [, startLoading] = useTransition();
  // An answer to an earlier opening that comes late is dropped.
  const latest = useRef(0);

  function openView() {
    const ask = latest.current + 1;
    latest.current = ask;
    setOpen(true);
    setFailed(false);
    startLoading(async () => {
      try {
        const loaded = await loadBookingQuickView(bookingId);
        if (latest.current !== ask) return;
        if (loaded) setView(loaded);
        else setFailed(true);
      } catch {
        if (latest.current === ask) setFailed(true);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openView}
        aria-haspopup="dialog"
        className="rounded-sm font-medium text-ink tabular-nums underline decoration-edge underline-offset-4 hover:decoration-ink focus-ring"
      >
        {label}
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={label}
        description={
          view
            ? `${view.status} · ${view.customer.name} · ${view.total}`
            : undefined
        }
        width="md"
      >
        <div className="grid gap-5 text-sm">
          {failed ? (
            <p className="text-danger">
              This booking could not be read. Close and try again.
            </p>
          ) : !view ? (
            <Loading label="Loading the booking">
              <RowsSkeleton rows={6} />
            </Loading>
          ) : (
            <>
              <Rows
                rows={[
                  ["Customer", view.customer.name],
                  ["Phone", view.customer.phone],
                  ...(view.customer.email
                    ? ([["Email", view.customer.email]] as [string, string][])
                    : []),
                ]}
              />
              {view.trips.map((trip) => (
                <section key={trip.id} className="grid gap-1">
                  <h3 className="font-semibold text-ink">
                    Trip {trip.position} · {trip.heading}
                    <span className="font-normal text-muted">
                      {" "}
                      · {trip.status}
                    </span>
                  </h3>
                  <Rows rows={trip.rows} />
                </section>
              ))}
            </>
          )}
          <div className="flex justify-end">
            <Button asChild variant="secondary" size="sm">
              <Link href={href}>Open Booking</Link>
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
