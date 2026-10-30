import {
  describePriceOverride,
  formatMyr,
  isItemStatus,
  isTripCategory,
  ITEM_STATUS_LABELS,
  priceBreakdownOf,
  tripSearchOf,
  tripViewOfItem,
} from "@repo/db";
import { hasGooglePlaces } from "@repo/places/server";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { Card } from "@repo/console/Card";
import { Notice } from "@repo/ui/notice";
import { PageHeader, RecordLink } from "@repo/console/PageHeader";
import { FormSkeleton, HeaderSkeleton } from "@repo/console/Skeleton";
import { ItemStatusBadge } from "@repo/console/StatusBadges";
import { getPermissions } from "../../../../../../_lib/access";
import { bookingHref } from "../../../../../../_lib/routes";
import type { ConsoleScope } from "../../../../../../_lib/scope";
import { scopedBooking } from "../../../_lib/scoped-booking";
import { amendDraftOf } from "../../../_lib/trip-form";
import { quoteTripView } from "../../../_lib/trip-server";
import { AmendItemForm } from "./AmendItemForm";

/** What stands where the item is loading: the header and the form. */
export function AmendItemSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <FormSkeleton fields={6} />
    </>
  );
}

/**
 * One trip of a booking in the manual booking's steps, filled in and
 * priced again, while it is received or confirmed; or why it cannot be
 * amended. A model chosen at booking that can no longer be chosen is
 * named above the form, since saving drops it and its charge. In a
 * location, a booking with no trip picking up there is not found.
 */
export async function amendItemScreen({
  id,
  itemId,
  scope,
}: {
  id: string;
  itemId: string;
  scope: ConsoleScope;
}) {
  const [booking, permissions] = await Promise.all([
    scopedBooking(id, scope),
    getPermissions(),
  ]);
  const item = booking.items.find((i) => i.id === itemId);
  if (!item) notFound();
  const trip = tripViewOfItem(item);
  const category = item.tripDetails?.vehicleClassCategory;
  if (!trip || !isTripCategory(category)) notFound();

  const title = `Amend trip ${item.position}`;
  // The booking it is a trip of, the way back to it.
  const meta = (
    <RecordLink href={bookingHref(scope.slug, booking.id)}>
      {booking.reference}
    </RecordLink>
  );

  if (item.status !== "received" && item.status !== "confirmed") {
    const status = isItemStatus(item.status)
      ? ITEM_STATUS_LABELS[item.status].toLowerCase()
      : item.status;
    return (
      <>
        <PageHeader
          title={title}
          badge={<ItemStatusBadge status={item.status} />}
          meta={meta}
        />
        <Card>
          <p className="text-sm text-body">
            This trip is {status}, so it cannot be amended.
          </p>
        </Card>
      </>
    );
  }

  const draft = amendDraftOf(
    item,
    await quoteTripView(category, tripSearchOf(trip)),
  );
  if (!draft) notFound();
  const override =
    item.priceOverrideSen !== null && item.priceOverrideReason !== null
      ? { totalSen: item.priceOverrideSen, reason: item.priceOverrideReason }
      : null;
  // The model chosen at booking, when the trip priced again no longer lets
  // it be chosen: the amend drops it, so the admin is told before saving.
  const bookedModel = item.tripDetails?.vehicleModelName ?? null;
  const modelCharge = priceBreakdownOf(item.priceBreakdown)?.model?.amountSen;
  const droppedModel =
    bookedModel && draft.vehicle.vehicleModelId === null
      ? `The ${bookedModel} chosen at booking can no longer be chosen here. Saving removes it${
          modelCharge ? ` and its ${formatMyr(modelCharge)} charge` : ""
        } from the booking.`
      : null;

  return (
    <>
      <PageHeader
        title={title}
        meta={meta}
        badge={
          <InfoTip text="Saving prices the trip again with today's rates, and the customer gets a “Booking updated” email." />
        }
      />
      {droppedModel ? (
        <div role="note" className="mb-5">
          <Notice>{droppedModel}</Notice>
        </div>
      ) : null}
      <AmendItemForm
        itemId={item.id}
        bookingHref={bookingHref(scope.slug, booking.id)}
        scope={scope.slug}
        draft={draft}
        hasGoogle={hasGooglePlaces}
        canPrice={permissions.includes("bookings.create")}
        priceNote={
          override
            ? `The agreed price in force, ${describePriceOverride(override)}, is removed when the trip is amended, because the quoted price changes. Enter a new one if the customer agreed to one.`
            : undefined
        }
      />
    </>
  );
}
