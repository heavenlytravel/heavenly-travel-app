import Link from "next/link";
import { PageHeader } from "../../../_components/PageHeader";
import { FormSkeleton, Streamed } from "../../../_components/Skeleton";
import { requireAdmin } from "../../../_lib/access";
import { LOCATIONS_PATH } from "../../../_lib/routes";
import { districtOptions } from "../_lib/district-options";
import { NewLocationForm } from "./NewLocationForm";

/**
 * Route: /locations/new. A name, a slug and the districts the place lies in
 * make a location. Marketing's screen behind `locations.manage`.
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
        description="A new location is a draft: nothing is public until it goes live."
      />

      <div className="mt-6 max-w-2xl">
        <Streamed fallback={<FormSkeleton fields={4} />}>
          {() => newLocation()}
        </Streamed>
      </div>
    </>
  );
}

/** The form, with the districts a location can lie in. */
async function newLocation() {
  return <NewLocationForm districts={await districtOptions()} />;
}
