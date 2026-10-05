import Link from "next/link";
import {
  describePriceOverride,
  isTripCategory,
  ITEM_STATUS_LABELS,
  isItemStatus,
  tripSearchOf,
  tripViewOfItem,
} from "@repo/db";
import { getBooking } from "@repo/db/server";
import { hasGooglePlaces } from "@repo/places/server";
import { notFound } from "next/navigation";
import { PageHeader } from "../../../../../_components/PageHeader";
import {
  BackLinkSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  Streamed,
} from "../../../../../_components/Skeleton";
import { getPermissions, requireAdmin } from "../../../../../_lib/access";
import { bookingHref } from "../../../../../_lib/routes";
import { itemDraftOf } from "../../../_lib/trip-form";
import { quoteTripView } from "../../../_lib/trip-server";
import { AmendItemForm } from "./AmendItemForm";

/**
 * Route: /bookings/[id]/amend/[itemId]. One item of a booking in the
 * manual booking's editor, filled in and priced again, while it is
 * received or confirmed. Reservation and Sales, behind `bookings.manage`.
 */
export default async function AmendItemPage({
  params,
}: PageProps<"/bookings/[id]/amend/[itemId]">) {
  await requireAdmin("bookings.manage");
  const { id, itemId } = await params;

  return (
    <Streamed
      fallback={
        <>
          <BackLinkSkeleton />
          <HeaderSkeleton />
          <div className="mt-6 max-w-3xl">
            <FormSkeleton fields={6} />
          </div>
        </>
      }
    >
      {() => amendItem({ id, itemId })}
    </Streamed>
  );
}

/** The item in the editor, or why it cannot be amended. */
async function amendItem({ id, itemId }: { id: string; itemId: string }) {
  const [booking, permissions] = await Promise.all([
    getBooking(id),
    getPermissions(),
  ]);
  const item = booking?.items.find((i) => i.id === itemId);
  if (!booking || !item) notFound();
  const trip = tripViewOfItem(item);
  const category = item.tripDetails?.vehicleClassCategory;
  if (!trip || !isTripCategory(category)) notFound();

  const back = (
    <p className="mb-4 text-sm">
      <Link
        href={bookingHref(booking.id)}
        className="text-neutral-600 underline-offset-4 hover:underline"
      >
        Back to {booking.reference}
      </Link>
    </p>
  );
  const title = `Amend item ${item.position} of ${booking.reference}`;

  if (item.status !== "received" && item.status !== "confirmed") {
    const status = isItemStatus(item.status)
      ? ITEM_STATUS_LABELS[item.status].toLowerCase()
      : item.status;
    return (
      <>
        {back}
        <PageHeader
          title={title}
          description={`This item is ${status}, so it cannot be amended.`}
        />
      </>
    );
  }

  const draft = itemDraftOf(
    item,
    await quoteTripView(category, tripSearchOf(trip)),
  );
  if (!draft) notFound();
  const override =
    item.priceOverrideSen !== null && item.priceOverrideReason !== null
      ? { totalSen: item.priceOverrideSen, reason: item.priceOverrideReason }
      : null;

  return (
    <>
      {back}
      <PageHeader
        title={title}
        description="Change the trip, the vehicle or the details. The trip is priced again with today's rates, and the customer gets a “Booking updated” email."
      />
      <div className="mt-6 max-w-3xl">
        <AmendItemForm
          bookingId={booking.id}
          itemId={item.id}
          draft={draft}
          hasGoogle={hasGooglePlaces}
          canPrice={permissions.includes("bookings.create")}
          priceNote={
            override
              ? `The agreed price in force, ${describePriceOverride(override)}, is removed when the item is amended, because the quoted price changes. Enter a new one if the customer agreed to one.`
              : undefined
          }
        />
      </div>
    </>
  );
}
