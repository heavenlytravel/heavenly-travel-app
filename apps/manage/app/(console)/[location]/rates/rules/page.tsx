import { tripRulesOf } from "@repo/db";
import type { LocationName } from "@repo/db/server";
import { notFound } from "next/navigation";
import { Card } from "@repo/console/Card";
import { FORM_WIDTH } from "@repo/console/PageColumn";
import { PageHeader } from "@repo/console/PageHeader";
import { CardSkeleton, FormSkeleton, Streamed } from "@repo/console/Skeleton";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import { sectionLabelOf } from "../../../../_lib/console-map";
import { locationDetails } from "../../../../_lib/location-data";
import { RATES_PAGE_LABELS, ratesHref } from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";
import { RatesByLocation } from "../_components/RatesByLocation";
import { TripRulesForm } from "../_components/TripRulesForm";
import { TripRulesList } from "../_components/TripRulesList";
import { visiblePriceLists } from "../_components/price-lists";

/**
 * Route: /[location]/rates/rules. Rates' third page: how far past a zone
 * a location serves an address, whether a trip may end in another
 * location, and the odd-hours and weekend surcharges, saved together.
 * Under a location, Operation changes them (`coverage.manage`) and
 * Reservation and Sales read them (`coverage.view`); under `~`, every
 * location's, read only, by location. See
 * docs/261023-nearest-zone-pricing.md.
 */
export default async function TripRulesPage({
  params,
}: PageProps<"/[location]/rates/rules">) {
  await requireAdmin("coverage.view");
  const { location } = await scopeOf(params);
  const manages = (await getPermissions()).includes("coverage.manage");

  return (
    <>
      <PageHeader
        section={sectionLabelOf("rates-rules")}
        title={RATES_PAGE_LABELS.rules}
      />
      <Streamed
        fallback={
          location && manages ? (
            <FormSkeleton sections={1} fields={4} />
          ) : (
            <CardSkeleton rows={4} />
          )
        }
      >
        {() =>
          location
            ? locationRules({ location, manages })
            : everyLocationRules({ manages })
        }
      </Streamed>
    </>
  );
}

async function locationRules({
  location,
  manages,
}: {
  location: LocationName;
  manages: boolean;
}) {
  const details = await locationDetails(location.id);
  if (!details) notFound();
  const rules = tripRulesOf(details);
  return (
    <Card className={FORM_WIDTH}>
      {manages ? (
        <TripRulesForm
          locationId={details.id}
          locationName={details.name}
          reach={rules.reach}
          oddHours={rules.oddHours}
          weekend={rules.weekend}
        />
      ) : (
        <TripRulesList rules={rules} locationName={details.name} />
      )}
    </Card>
  );
}

async function everyLocationRules({ manages }: { manages: boolean }) {
  const lists = await visiblePriceLists();
  return (
    <RatesByLocation
      locations={lists}
      hrefOf={(slug) => ratesHref(slug, "rules")}
      manages={manages}
    >
      {(list) => (
        <Card>
          <TripRulesList rules={tripRulesOf(list)} locationName={list.name} />
        </Card>
      )}
    </RatesByLocation>
  );
}
