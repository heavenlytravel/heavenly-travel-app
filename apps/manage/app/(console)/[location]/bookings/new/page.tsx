import { ADVANCE_PERMISSIONS } from "@repo/db";
import { getLocationSearch, nextBookingNumbers } from "@repo/db/server";
import { hasGooglePlaces } from "@repo/places/server";
import { PageHeader } from "@repo/console/PageHeader";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import { scopeOf } from "../../../../_lib/scope";
import { NewBookingForm } from "./NewBookingForm";

/**
 * Route: /[location]/bookings/new. Staff enter a booking that arrived by
 * phone, WhatsApp or email, of one trip or several, through the same
 * pricing as the website. In a location the place fields suggest its
 * places first, as the search card on its pages does, and the booking
 * opens there once made; which location prices a trip is still its
 * pick-up's, as on the site. Reservation and Sales, behind
 * `bookings.create`; one who may confirm may also make it confirmed, paid
 * already. The form shows the number it would take.
 */
export default async function NewBookingPage({
  params,
}: PageProps<"/[location]/bookings/new">) {
  await requireAdmin("bookings.create");
  const scope = await scopeOf(params);
  const [search, permissions, numbers] = await Promise.all([
    scope.slug ? getLocationSearch(scope.slug) : null,
    getPermissions(),
    nextBookingNumbers(),
  ]);

  return (
    <>
      <PageHeader title="New Booking" />
      <NewBookingForm
        hasGoogle={hasGooglePlaces}
        scope={scope.slug}
        near={search?.near ?? undefined}
        canConfirm={permissions.includes(ADVANCE_PERMISSIONS.confirmed)}
        numbers={numbers}
      />
    </>
  );
}
