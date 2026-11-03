import { getGuideRates, listGuideRates } from "@repo/db/server";
import { InfoTip } from "@repo/ui/info-tip";
import { Card, CardTitle } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";
import { CardSkeleton, Streamed } from "@repo/console/Skeleton";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import { RATES_PAGE_LABELS, ratesHref } from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";
import { GuideRates } from "../_components/GuideRates";
import { RatesByLocation } from "../_components/RatesByLocation";
import { visiblePriceLists } from "../_components/price-lists";

const GUIDES_TIP =
  "A row for each language a guide may speak. Switch one on to sell it on the website; a trip shows it only when its price for that trip is set.";

function Title() {
  return (
    <CardTitle inset meta="RM per trip">
      <span className="inline-flex items-center gap-1.5">
        Languages
        <InfoTip text={GUIDES_TIP} />
      </span>
    </CardTitle>
  );
}

/**
 * Route: /[location]/rates/guides. Rates' tour guide price list: for each
 * language, whether the website sells a guide in it, and the price one-way,
 * for a 4, 8 or 12-hour hire and per extra hour. Under a location,
 * Operation (`coverage.manage`) edits it and Reservation and Sales read it
 * (`coverage.view`). Under `~`, every location's, read only. See
 * docs/261103-tour-guide.md, "Guide rates".
 */
export default async function GuideRatesPage({
  params,
}: PageProps<"/[location]/rates/guides">) {
  await requireAdmin("coverage.view");
  const { location } = await scopeOf(params);
  const manages = (await getPermissions()).includes("coverage.manage");

  return (
    <>
      <PageHeader title={RATES_PAGE_LABELS.guides} />
      <Streamed fallback={<CardSkeleton rows={6} />}>
        {async () => {
          if (location) {
            const rows = await getGuideRates(location.id);
            return (
              <Card flush>
                <Title />
                <GuideRates
                  locationId={location.id}
                  rows={rows}
                  readOnly={!manages}
                />
              </Card>
            );
          }
          const lists = await visiblePriceLists();
          const rates = await listGuideRates(lists.map((list) => list.id));
          return (
            <RatesByLocation
              locations={lists}
              hrefOf={(slug) => ratesHref(slug, "guides")}
              manages={manages}
            >
              {(list) => (
                <Card flush>
                  <Title />
                  <GuideRates
                    locationId={list.id}
                    rows={rates.get(list.id) ?? []}
                    readOnly
                  />
                </Card>
              )}
            </RatesByLocation>
          );
        }}
      </Streamed>
    </>
  );
}
