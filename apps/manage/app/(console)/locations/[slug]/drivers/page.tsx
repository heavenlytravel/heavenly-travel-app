import Link from "next/link";
import { searchTermOf } from "@repo/db";
import { Button } from "@repo/ui/button";
import { FleetList } from "../../../../_components/FleetList";
import { SectionHeader } from "../../../../_components/SectionHeader";
import { requireAdmin } from "../../../../_lib/access";
import {
  DUE_PARAM,
  locationDriversHref,
  newLocationDriverHref,
  SEARCH_PARAM,
} from "../../../../_lib/routes";
import { locationKey } from "../../_lib/location-data";

/**
 * Route: /locations/[slug]/drivers?due=1&q=…. Operation's tab: our
 * drivers based at the location, active first, by name, with the classes
 * they may drive and the licences due within 30 days or expired;
 * narrowed to those with one due, to a search by name or phone, or both.
 * A driver opens their form here. See docs/261019-vehicles-and-drivers.md.
 */
export default async function LocationDriversPage({
  params,
  searchParams,
}: PageProps<"/locations/[slug]/drivers">) {
  await requireAdmin("fleet.manage");
  const { slug } = await params;
  const { id } = await locationKey(slug);
  const query = await searchParams;
  const due = query.due === DUE_PARAM;
  const q = searchTermOf(query[SEARCH_PARAM]) ?? undefined;

  return (
    <>
      <SectionHeader
        title="Drivers"
        description="The drivers based here, ours and other vendors', the classes each may drive, and the expiry dates of their licences."
        action={
          <Button asChild>
            <Link href={newLocationDriverHref(slug)}>Add driver</Link>
          </Button>
        }
      />
      <div className="mt-4">
        <FleetList
          kind="drivers"
          filter={{ due, q }}
          hrefOf={(filter) => locationDriversHref(slug, filter)}
          locationId={id}
        />
      </div>
    </>
  );
}
