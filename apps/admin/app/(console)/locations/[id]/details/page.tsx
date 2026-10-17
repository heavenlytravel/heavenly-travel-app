import { hasBeenLive, isPlace, isSlugLocked } from "@repo/db";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "../../../../_components/Card";
import { CardSkeleton, Streamed } from "../../../../_components/Skeleton";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import { SAVED_ADDRESSES_ID } from "../../../../_lib/routes";
import { locationDetails } from "../../_lib/location-data";
import { stateOptions } from "../../_lib/state-options";
import { DeleteLocation } from "../DeleteLocation";
import { LocationDetailsForm } from "../LocationDetailsForm";
import { SavedAddresses, type SavedAddress } from "../SavedAddresses";

/**
 * Route: /locations/[id]/details. Marketing's tab, step 1 of the setup:
 * the name, the slug and the states the location lies in, its saved
 * addresses, and at the foot, for SUPER, its deletion.
 */
export default async function LocationDetailsPage({
  params,
}: PageProps<"/locations/[id]/details">) {
  await requireAdmin("locations.manage");
  const { id } = await params;

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
      <Card id={SAVED_ADDRESSES_ID} className="scroll-mt-6">
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            Saved addresses
            <InfoTip text="The places most customers go to here. The drop-off offers them before anything is typed; typing still searches any exact place. Exact spots only, never an area, each in one of the states ticked above." />
          </span>
        </CardTitle>
        <SavedAddresses locationId={location.id} addresses={addresses} />
      </Card>
      {permissions.includes("locations.activate") ? (
        <Card>
          <CardTitle>Delete</CardTitle>
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
