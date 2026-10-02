import Link from "next/link";
import { isPlace, isSlugLocked } from "@repo/db";
import { getLocation } from "@repo/db/server";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "../../../_components/Card";
import { PageHeader } from "../../../_components/PageHeader";
import { Rows } from "../../../_components/Rows";
import { LocationStateBadge } from "../../../_components/StatusBadges";
import { requireAdmin } from "../../../_lib/access";
import { LOCATIONS_PATH } from "../../../_lib/routes";
import { districtOptions } from "../_lib/district-options";
import { LocationDetailsForm } from "./LocationDetailsForm";
import { SavedAddresses, type SavedAddress } from "./SavedAddresses";

/**
 * Route: /locations/[id]. One location for Marketing: its details, its
 * saved addresses, and whether pickups are served in each of its districts,
 * as information.
 */
export default async function LocationPage({
  params,
}: PageProps<"/locations/[id]">) {
  await requireAdmin("locations.manage");
  const { id } = await params;
  const [location, districts] = await Promise.all([
    getLocation(id),
    districtOptions(),
  ]);
  if (!location) notFound();

  const addresses: SavedAddress[] = location.addresses.map((address) => {
    const spot = isPlace(address.place) ? address.place : null;
    return {
      id: address.id,
      name: address.name,
      placeId: spot?.placeId ?? "",
      placeLabel: spot?.label ?? "",
      placeAddress: spot?.address ?? "",
    };
  });

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={LOCATIONS_PATH}
          className="text-neutral-600 underline-offset-4 hover:underline"
        >
          All locations
        </Link>
      </p>
      <PageHeader
        title={location.name}
        description={`Its address on the customer site is /${location.slug}.`}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="grid gap-6">
          <Card>
            <CardTitle>Details</CardTitle>
            <LocationDetailsForm
              location={{
                id: location.id,
                name: location.name,
                slug: location.slug,
                tagline: location.tagline,
                districtCodes: location.districtCodes,
                slugLocked: isSlugLocked(location),
              }}
              districts={districts}
            />
          </Card>
          <Card>
            <CardTitle>
              <span className="inline-flex items-center gap-1.5">
                Saved addresses
                <InfoTip text="The places most customers go to here. The drop-off offers them before anything is typed; typing still searches any exact place. Exact spots only, never an area." />
              </span>
            </CardTitle>
            <SavedAddresses locationId={location.id} addresses={addresses} />
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardTitle>State</CardTitle>
            <LocationStateBadge state={location.state} />
          </Card>
          <Card>
            <CardTitle>
              <span className="inline-flex items-center gap-1.5">
                Pickups
                <InfoTip text="Whether a pickup is served in each district of this location. The switches are Operation's, on the Coverage screen. They do not show or hide the pages: with pickups off, the location is still a destination we drive to." />
              </span>
            </CardTitle>
            {location.districts.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No district ticked yet.
              </p>
            ) : (
              <Rows
                rows={location.districts.map((district) => [
                  `${district.name}, ${district.state.name}`,
                  district.isActive ? "On" : "Off",
                ])}
              />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
