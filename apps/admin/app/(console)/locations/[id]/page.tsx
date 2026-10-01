import Link from "next/link";
import { isPlace, isSlugLocked } from "@repo/db";
import { getLocation } from "@repo/db/server";
import { hasGooglePlaces } from "@repo/places/server";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "../../../_components/Card";
import { PageHeader } from "../../../_components/PageHeader";
import { Rows } from "../../../_components/Rows";
import { LocationStateBadge } from "../../../_components/StatusBadges";
import { requireAdmin } from "../../../_lib/access";
import { LOCATIONS_PATH } from "../../../_lib/routes";
import { LocationDetailsForm } from "./LocationDetailsForm";
import { SavedAddresses, type SavedAddress } from "./SavedAddresses";

/**
 * Route: /locations/[id]. One location for Marketing: its details, its
 * saved addresses, and the district its pin falls in, as information.
 */
export default async function LocationPage({
  params,
}: PageProps<"/locations/[id]">) {
  await requireAdmin("locations.manage");
  const { id } = await params;
  const location = await getLocation(id);
  if (!location) notFound();

  const place = isPlace(location.place) ? location.place : null;
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
  const { district } = location;

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
                slugLocked: isSlugLocked(location),
                place: place && { placeId: place.placeId, label: place.label },
              }}
              hasGoogle={hasGooglePlaces}
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

        <Card>
          <CardTitle>
            <span className="inline-flex items-center gap-1.5">
              Where it is
              <InfoTip text="The district is where the place's pin falls; nobody chooses it. Whether pickups there are served is Operation's switch on the Coverage screen. It does not show or hide the pages: with pickups off, the location is still a destination we drive to." />
            </span>
          </CardTitle>
          <Rows
            rows={[
              ["State", <LocationStateBadge key="s" state={location.state} />],
              ["Place", place?.label ?? "Unknown"],
              ["District", `${district.name}, ${district.state.name}`],
              ["Pickups there", district.isActive ? "On" : "Off"],
            ]}
          />
        </Card>
      </div>
    </>
  );
}
