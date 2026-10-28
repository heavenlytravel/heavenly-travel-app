import Link from "next/link";
import { hasGooglePlaces } from "@repo/places/server";
import { PageHeader } from "@repo/console/PageHeader";
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
          className="text-slate-600 underline-offset-4 hover:underline"
        >
          All bookings
        </Link>
      </p>
      <PageHeader
        title="New booking"
        description="A booking that came by phone, WhatsApp or email, in four steps: the customer, the trip, the vehicle and the details. The trip is priced as the website prices it."
      />
      <div className="mt-6">
        <NewBookingForm hasGoogle={hasGooglePlaces} />
      </div>
    </>
  );
}
