"use client";

import { Button } from "@repo/ui/button";
import { Dialog } from "@repo/ui/dialog";
import { FormError } from "@repo/ui/form-error";
import Link from "next/link";
import { useState, useTransition } from "react";
import { loadBookingQuickView, type BookingQuickView } from "./actions";

/**
 * "View" beside a trip or a booking on the Assign page: the booking at a
 * glance in a dialog, the customer, each trip and the total, without
 * leaving the page; "Open booking" goes to its page.
 */
export function QuickViewButton({
  bookingId,
  reference,
  href,
}: {
  bookingId: string;
  reference: string;
  /** The booking's page, in the scope the Assign page is in. */
  href: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<BookingQuickView | null>(null);
  const [loading, startLoading] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openView() {
    setError(null);
    startLoading(async () => {
      const loaded = await loadBookingQuickView(bookingId);
      if (!loaded) {
        setError("This booking could not be opened.");
        return;
      }
      setView(loaded);
      setOpen(true);
    });
  }

  return (
    <span className="inline-grid justify-items-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={openView}
        pending={loading}
        aria-label={`View ${reference}`}
      >
        View
      </Button>
      <FormError error={error} size="xs" />
      {view ? (
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title={view.reference}
          description={`${view.status} · ${view.customer.name} · ${view.total}`}
          width="md"
        >
          <div className="grid gap-4 text-sm">
            <dl className="grid gap-1 rounded-control bg-shade p-3">
              <QuickRow label="Customer" value={view.customer.name} />
              <QuickRow label="Phone" value={view.customer.phone} />
              {view.customer.email ? (
                <QuickRow label="Email" value={view.customer.email} />
              ) : null}
            </dl>
            {view.trips.map((trip) => (
              <section key={trip.id} className="grid gap-1.5">
                <h3 className="font-semibold text-ink">
                  Trip {trip.position} · {trip.heading}{" "}
                  <span className="font-normal text-muted">
                    · {trip.status}
                  </span>
                </h3>
                <dl className="grid gap-1">
                  {trip.rows.map(([label, value]) => (
                    <QuickRow key={label} label={label} value={value} />
                  ))}
                </dl>
              </section>
            ))}
            <div className="flex justify-end">
              <Button asChild variant="secondary" size="sm">
                <Link href={href}>Open booking</Link>
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </span>
  );
}

function QuickRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-body">{value}</dd>
    </div>
  );
}
