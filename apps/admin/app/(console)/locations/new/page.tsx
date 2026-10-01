import Link from "next/link";
import { hasGooglePlaces } from "@repo/places/server";
import { PageHeader } from "../../../_components/PageHeader";
import { requireAdmin } from "../../../_lib/access";
import { LOCATIONS_PATH } from "../../../_lib/routes";
import { NewLocationForm } from "./NewLocationForm";

/**
 * Route: /locations/new. A place picked by search becomes a location, in
 * the district its pin falls in. Marketing's screen behind
 * `locations.manage`.
 */
export default async function NewLocationPage() {
  await requireAdmin("locations.manage");

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
        title="Add location"
        description="Pick the place first. A new location is a draft: nothing is public until it goes live."
      />

      <div className="mt-6 max-w-2xl">
        <NewLocationForm hasGoogle={hasGooglePlaces} />
      </div>
    </>
  );
}
