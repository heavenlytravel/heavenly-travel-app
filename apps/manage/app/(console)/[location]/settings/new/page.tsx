import { notFound } from "next/navigation";
import { PageHeader } from "@repo/console/PageHeader";
import { FormSkeleton, Streamed } from "@repo/console/Skeleton";
import { requireAdmin } from "../../../../_lib/access";
import { scopeOf } from "../../../../_lib/scope";
import { stateOptions } from "../../../../_lib/state-options";
import { NewLocationForm } from "./NewLocationForm";

/**
 * Route: /~/settings/new. A name, a slug and the states the place lies in
 * make a location, a draft whose classes, coverage and rates, and pages
 * follow on its dashboard's checklist. Marketing's screen behind
 * `locations.manage`, console-wide: under a location it is not found.
 */
export default async function NewLocationPage({
  params,
}: PageProps<"/[location]/settings/new">) {
  await requireAdmin("locations.manage");
  const { slug } = await scopeOf(params);
  if (slug !== null) notFound();

  return (
    <>
      <PageHeader title="Add Location" meta="Step 1 of 4, as a draft" />
      <Streamed fallback={<FormSkeleton fields={3} />}>
        {() => newLocation()}
      </Streamed>
    </>
  );
}

/** The form, with the states a location can lie in. */
async function newLocation() {
  return <NewLocationForm states={await stateOptions()} />;
}
