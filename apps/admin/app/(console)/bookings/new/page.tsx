import Link from "next/link";
import { hasGooglePlaces } from "@repo/places/server";
import { PageHeader } from "../../../_components/PageHeader";
import { requireAdmin } from "../../../_lib/access";
import { BOOKINGS_PATH } from "../../../_lib/routes";
import { NewBookingForm } from "./NewBookingForm";

/**
 * Route: /bookings/new. Staff enter a booking that arrived by phone,
 * WhatsApp or email, through the same pricing as the website. Reservation
 * and Sales, behind `bookings.create`.
 */
export default async function NewBookingPage() {
  await requireAdmin("bookings.create");

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={BOOKINGS_PATH}
          className="text-neutral-600 underline-offset-4 hover:underline"
        >
          All bookings
        </Link>
      </p>
      <PageHeader
        title="New booking"
        description="Enter the trip and get prices, then choose the vehicle and fill in the customer. Add another vehicle for a group that needs more than one. The booking is received until it is confirmed, like one from the site."
      />
      <div className="mt-6 max-w-3xl">
        <NewBookingForm hasGoogle={hasGooglePlaces} />
      </div>
    </>
  );
}
