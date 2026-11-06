import {
  getLocationSearch,
  invoicePreviewOf,
  listAgents,
} from "@repo/db/server";
import { hasGooglePlaces } from "@repo/places/server";
import { PageHeader } from "@repo/console/PageHeader";
import { requireAdmin } from "../../../../_lib/access";
import { locationsVisible, scopeOf } from "../../../../_lib/scope";
import { NewBookingForm } from "./NewBookingForm";

/**
 * Route: /[location]/bookings/new. Staff enter a booking that arrived by
 * phone, WhatsApp or email, of one trip or several, through the same
 * pricing as the website, confirmed as it is made. In a location the
 * place fields suggest its places first, as the search card on its pages
 * does, and the booking opens there once made; which location prices a
 * trip is still its pick-up's, as on the site. Reservation and Sales,
 * behind `bookings.create`. The form shows the invoice it would get, and offers the agents a booking may come through, and a way to
 * add one.
 */
export default async function NewBookingPage({
  params,
}: PageProps<"/[location]/bookings/new">) {
  await requireAdmin("bookings.create");
  const scope = await scopeOf(params);
  const [search, ownInvoice, agents, locations] = await Promise.all([
    scope.slug ? getLocationSearch(scope.slug) : null,
    invoicePreviewOf({ agentId: null, startsAt: new Date() }),
    listAgents(),
    locationsVisible(),
  ]);

  return (
    <>
      <PageHeader title="New Booking" />
      <NewBookingForm
        hasGoogle={hasGooglePlaces}
        scope={scope.slug}
        near={search?.near ?? undefined}
        ownInvoice={ownInvoice.ok ? ownInvoice.preview : null}
        agentLocations={locations}
        locationId={scope.location?.id ?? null}
        agents={agents}
      />
    </>
  );
}
