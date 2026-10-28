import Link from "next/link";
import { isBookingStatus, searchTermOf } from "@repo/db";
import { Button } from "@repo/ui/button";
import { FilterSelect } from "../../_components/FilterSelect";
import { PageHeader } from "../../_components/PageHeader";
import { pageOf } from "../../_components/Pager";
import { getPermissions, requireAdmin } from "../../_lib/access";
import { locationFilterOptions } from "../../_lib/filter-options";
import {
  bookingsHref,
  NEW_BOOKING_PATH,
  PAGE_PARAM,
  SEARCH_PARAM,
} from "../../_lib/routes";
import { BookingsList } from "./_components/BookingsList";
import { locationNames } from "../../_lib/location-names";

/**
 * Route: /bookings?status=received&location=…&q=…&page=2. The queue
 * across locations, newest first, narrowed by status, by location, by a
 * search, or any of them. A location's own list is its Bookings tab.
 */
export default async function BookingsPage({
  searchParams,
}: PageProps<"/bookings">) {
  await requireAdmin("bookings.view");
  const params = await searchParams;
  const status = isBookingStatus(params.status) ? params.status : undefined;
  const location =
    typeof params.location === "string" && params.location
      ? params.location
      : undefined;
  const q = searchTermOf(params[SEARCH_PARAM]) ?? undefined;
  const page = pageOf(params[PAGE_PARAM]);
  const [permissions, locations] = await Promise.all([
    getPermissions(),
    locationNames(),
  ]);

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Every booking, made on the site or entered here. Open one to confirm it, assign it, mark it completed, or cancel it."
        action={
          permissions.includes("bookings.create") ? (
            <Button asChild>
              <Link href={NEW_BOOKING_PATH}>New booking</Link>
            </Button>
          ) : null
        }
      />
      <div className="mt-6">
        <BookingsList
          filter={{ status, q, page }}
          hrefOf={(filter) => bookingsHref({ ...filter, location })}
          locationId={location}
          locationFilter={
            <FilterSelect
              label="Location"
              value={location ?? ""}
              options={locationFilterOptions(locations, (next) =>
                bookingsHref({ status, q, location: next }),
              )}
            />
          }
        />
      </div>
    </>
  );
}
