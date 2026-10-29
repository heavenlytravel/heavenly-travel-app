import { getLocationSearch } from "@repo/db/server";
import { hasGooglePlaces } from "@repo/places/server";
import { BackLink, PageHeader } from "@repo/console/PageHeader";
import { requireAdmin } from "../../../../_lib/access";
import { bookingsHref } from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";
import { NewBookingForm } from "./NewBookingForm";

/**
 * Route: /[location]/bookings/new. Staff enter a booking that arrived by
 * phone, WhatsApp or email, of one trip or several, through the same
 * pricing as the website. In a location the place fields suggest its
 * places first, as the search card on its pages does, and the booking
 * opens there once made; which location prices a trip is still its
 * pick-up's, as on the site. Reservation and Sales, behind
 * `bookings.create`.
 */
export default async function NewBookingPage({
  params,
}: PageProps<"/[location]/bookings/new">) {
  await requireAdmin("bookings.create");
  const scope = await scopeOf(params);
  const search = scope.slug ? await getLocationSearch(scope.slug) : null;

  return (
    <>
      <BackLink href={bookingsHref(scope.slug)}>Bookings</BackLink>
      <PageHeader title="New booking" />
      <NewBookingForm
        hasGoogle={hasGooglePlaces}
        scope={scope.slug}
        near={search?.near ?? undefined}
      />
    </>
  );
}
