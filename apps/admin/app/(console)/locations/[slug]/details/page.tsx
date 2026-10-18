import { hasBeenLive, isPlace, isSlugLocked } from "@repo/db";
import { statesBounds } from "@repo/db/server";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "../../../../_components/Card";
import { CardSkeleton, Streamed } from "../../../../_components/Skeleton";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import { SAVED_ADDRESSES_ID } from "../../../../_lib/routes";
import { locationDetails, locationKey } from "../../_lib/location-data";
import { stateOptions } from "../../_lib/state-options";
import { DeleteLocation } from "../DeleteLocation";
import { LocationDetailsForm } from "../LocationDetailsForm";
import { SavedAddresses, type SavedAddress } from "../SavedAddresses";

/**
 * Route: /locations/[slug]/details. Marketing's tab, step 1 of the setup:
 * the name, the slug and the states the location lies in, its saved
 * addresses, and at the foot, for SUPER, its deletion.
 */
export default async function LocationDetailsPage({
  params,
}: PageProps<"/locations/[slug]/details">) {
  await requireAdmin("locations.manage");
  const { slug } = await params;
  const { id } = await locationKey(slug);

  return (
    <div className="grid gap-6">
      <Streamed
        fallback={
          <>
            <CardSkeleton rows={5} />
            <CardSkeleton rows={3} />
          </>
        }
      >
        {() => details({ id })}
      </Streamed>
    </div>
  );
}

async function details({ id }: { id: string }) {
  const [location, states, permissions] = await Promise.all([
    locationDetails(id),
    stateOptions(),
    getPermissions(),
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
      usedBy: address.usedBy,
      isStray: address.isStray,
    };
  });

  return (
    <>
      <Card>
        <CardTitle>Details</CardTitle>
        <LocationDetailsForm
          location={{
            id: location.id,
            name: location.name,
            slug: location.slug,
            stateCodes: location.states.map((state) => state.code).sort(),
            slugLocked: isSlugLocked(location),
          }}
          states={states}
        />
      </Card>
      <SavedAddresses
        id={SAVED_ADDRESSES_ID}
        locationId={location.id}
        stateNames={location.states.map((state) => state.name)}
        within={statesBounds(location.states.map((state) => state.code))}
        addresses={addresses}
      />
      {permissions.includes("locations.activate") ? (
        <Card>
          <CardTitle description="For good: its pages and saved addresses go with it.">
            Delete location
          </CardTitle>
          <DeleteLocation
            locationId={location.id}
            name={location.name}
            slug={location.slug}
            hasBeenLive={hasBeenLive(location)}
          />
        </Card>
      ) : null}
    </>
  );
}
