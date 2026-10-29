import { BackLink } from "@repo/console/PageHeader";
import { requireAdmin } from "../../../../../_lib/access";
import {
  RATES_PAGE_LABELS,
  classesHref,
  offeringBackHref,
  offeringFromOf,
  OFFERING_FROM_PARAM,
} from "../../../../../_lib/routes";
import { scopeOf } from "../../../../../_lib/scope";
import { ClassEditor } from "../_catalogue/ClassEditor";
import { OfferingEditor } from "../_offerings/OfferingEditor";

/**
 * Route: /[location]/fleet/classes/[id], and …/new for one not there yet.
 * Under `~` a class of the catalogue, by its id. Under a location the
 * class as it sells it, by the offering's id: its rates and rules, and
 * the class's vehicles there; opened from Rates' class rates
 * (`?from=rates`), it goes back there. Operation's (`coverage.manage`).
 */
export default async function ClassPage({
  params,
  searchParams,
}: PageProps<"/[location]/fleet/classes/[id]">) {
  await requireAdmin("coverage.manage");
  const scope = await scopeOf(params);
  const { id } = await params;

  if (!scope.location) {
    return (
      <>
        <BackLink href={classesHref(null)}>Classes</BackLink>
        <ClassEditor id={id} />
      </>
    );
  }
  const from = offeringFromOf((await searchParams)[OFFERING_FROM_PARAM]);
  return (
    <>
      <BackLink href={offeringBackHref(scope.location.slug, from)}>
        {from === "rates" ? RATES_PAGE_LABELS.classes : "Classes"}
      </BackLink>
      <OfferingEditor location={scope.location} id={id} from={from} />
    </>
  );
}
