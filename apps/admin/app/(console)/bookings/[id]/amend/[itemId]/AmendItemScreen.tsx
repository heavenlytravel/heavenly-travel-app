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
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "../../../../../_components/PageHeader";
import { SectionHeader } from "../../../../../_components/SectionHeader";
import {
  BackLinkSkeleton,
  FormSkeleton,
  HeaderSkeleton,
} from "../../../../../_components/Skeleton";
import { getPermissions } from "../../../../../_lib/access";
import { amendItemHref, bookingHref } from "../../../../../_lib/routes";
import type { BookingPlace } from "../../BookingScreen";
import { itemDraftOf } from "../../../_lib/trip-form";
import { quoteTripView } from "../../../_lib/trip-server";
import { AmendItemForm } from "./AmendItemForm";

/** What stands where the item is loading: the way back, the header and the form. */
export function AmendItemSkeleton() {
  return (
    <>
      <BackLinkSkeleton />
      <HeaderSkeleton />
      <div className="mt-6 max-w-3xl">
        <FormSkeleton fields={6} />
      </div>
    </>
  );
}

/**
 * One item of a booking in the manual booking's editor, filled in and
 * priced again, while it is received or confirmed; or why it cannot be
 * amended. Inside a location, a section under the location's header whose
 * links stay in the location; a booking with no item picking up there
 * opens from the queue instead.
 */
export async function amendItemScreen({
  id,
  itemId,
  place,
}: {
  id: string;
  itemId: string;
  place: BookingPlace;
}) {
  const [booking, permissions] = await Promise.all([
    getBooking(id),
    getPermissions(),
  ]);
  const item = booking?.items.find((i) => i.id === itemId);
  if (!booking || !item) notFound();
  const trip = tripViewOfItem(item);
  const category = item.tripDetails?.vehicleClassCategory;
  if (!trip || !isTripCategory(category)) notFound();
  if (place && !booking.items.some((entry) => entry.locationId === place.id)) {
    redirect(amendItemHref(booking.id, item.id));
  }
  const slug = place?.slug;
  const Header = place ? SectionHeader : PageHeader;

  const back = (
    <p className="mb-4 text-sm">
      <Link
        href={bookingHref(booking.id, slug)}
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
        <Header
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
      <Header
        title={title}
        description="Change the trip, the vehicle or the details. The trip is priced again with today's rates, and the customer gets a “Booking updated” email."
      />
      <div className="mt-6 max-w-3xl">
        <AmendItemForm
          bookingId={booking.id}
          itemId={item.id}
          locationSlug={slug}
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
