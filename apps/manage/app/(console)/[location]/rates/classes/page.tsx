import Link from "next/link";
import { plural } from "@repo/db";
import type { LocationName, Offering } from "@repo/db/server";
import type { ReactNode } from "react";
import { CARD_LINK, Card, CardTitle } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";
import { CardSkeleton, Streamed } from "@repo/console/Skeleton";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import { locationOfferings } from "../../../../_lib/location-data";
import {
  RATES_PAGE_LABELS,
  classHref,
  classesHref,
  ratesHref,
} from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";
import { ClassRates } from "../_components/ClassRates";
import { RatesByLocation } from "../_components/RatesByLocation";
import { visiblePriceLists } from "../_components/price-lists";

/**
 * Route: /[location]/rates/classes. Rates' first page: the classes a
 * location sells at their rates and under their rules, on sale or not,
 * the rate per extra km a one-way trip pays past a zone's edge and the
 * hourly rate. Under a location, Operation (`coverage.manage`) opens a
 * class's editor from its row, which comes back here; Reservation and
 * Sales read them (`coverage.view`). Under `~`, every location's, read
 * only, by location. See docs/261023-nearest-zone-pricing.md.
 */
export default async function RateClassesPage({
  params,
}: PageProps<"/[location]/rates/classes">) {
  await requireAdmin("coverage.view");
  const { location } = await scopeOf(params);
  const manages = (await getPermissions()).includes("coverage.manage");

  return (
    <>
      <PageHeader title={RATES_PAGE_LABELS.classes} />
      <Streamed fallback={<CardSkeleton rows={4} />}>
        {() =>
          location
            ? locationClasses({ location, manages })
            : everyLocationClasses({ manages })
        }
      </Streamed>
    </>
  );
}

async function locationClasses({
  location,
  manages,
}: {
  location: LocationName;
  manages: boolean;
}) {
  const offerings = await locationOfferings(location.id);
  return (
    <ClassesCard
      offerings={offerings}
      action={
        manages ? (
          <Link href={classesHref(location.slug)} className={CARD_LINK}>
            Edit classes on sale
          </Link>
        ) : null
      }
      editHref={
        manages
          ? (offeringId) => classHref(location.slug, offeringId, "rates")
          : undefined
      }
    />
  );
}

async function everyLocationClasses({ manages }: { manages: boolean }) {
  const lists = await visiblePriceLists();
  return (
    <RatesByLocation
      locations={lists}
      hrefOf={(slug) => ratesHref(slug, "classes")}
      manages={manages}
    >
      {(list) => <ClassesCard offerings={list.offerings} />}
    </RatesByLocation>
  );
}

/** A location's classes at their rates, in a card counting those on sale. */
function ClassesCard({
  offerings,
  action,
  editHref,
}: {
  offerings: Offering[];
  action?: ReactNode;
  editHref?: (offeringId: string) => string;
}) {
  const onSale = offerings.filter(
    (offering) => offering.isActive && offering.vehicleClass.isActive,
  ).length;
  return (
    <Card flush>
      <CardTitle
        inset
        meta={`${plural(onSale, "class", "classes")} on sale`}
        action={action}
      >
        Classes
      </CardTitle>
      <ClassRates offerings={offerings} editHref={editHref} />
    </Card>
  );
}
