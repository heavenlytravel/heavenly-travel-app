import { PageHeader } from "../../../_components/PageHeader";
import { FormSkeleton, Streamed } from "../../../_components/Skeleton";
import { requireAdmin } from "../../../_lib/access";
import { stateOptions } from "../_lib/state-options";
import { NewLocationForm } from "./NewLocationForm";

/**
 * Route: /locations/new. A name, a slug and the state the place lies in
 * make a location. Marketing's screen behind `locations.manage`.
 */
export default async function NewLocationPage() {
  await requireAdmin("locations.manage");

  return (
    <>
      <PageHeader
        title="Add location"
        description="Step 1 of 4. A new location is a draft; its vehicle classes, its coverage and rates, and its pages follow on its page. It goes live once every step is done."
      />

      <div className="mt-6 max-w-2xl">
        <Streamed fallback={<FormSkeleton fields={3} />}>
          {() => newLocation()}
        </Streamed>
      </div>
    </>
  );
}

/** The form, with the states a location can lie in. */
async function newLocation() {
  return <NewLocationForm states={await stateOptions()} />;
}
