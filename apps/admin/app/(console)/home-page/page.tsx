import { listTopChoiceCandidates, listTopChoices } from "@repo/db/server";
import { InfoTip } from "@repo/ui/info-tip";
import { Card, CardTitle } from "../../_components/Card";
import { PageHeader } from "../../_components/PageHeader";
import { RowsSkeleton, Streamed } from "../../_components/Skeleton";
import { requireAdmin } from "../../_lib/access";
import { TopChoiceControl } from "./TopChoiceControl";

/**
 * Route: /home-page. What Marketing sets on the customer site's home page:
 * the top choices, the location cards beside the airport's. Anything else
 * the home page comes to need from Marketing belongs here. Behind
 * `locations.manage`. See docs/261003-location-flow.md.
 */
export default async function HomePageScreen() {
  await requireAdmin("locations.manage");

  return (
    <>
      <PageHeader
        title="Home page"
        description="What the customer site's home page shows from Marketing."
      />

      <div className="mt-6 max-w-2xl">
        <Card>
          <CardTitle>
            <span className="inline-flex items-center gap-1.5">
              Top choices
              <InfoTip text="The location cards on the home page, in this order, after the airport card. Each card shows the location's name, its tagline and the landing page's hero image, and opens the location's page." />
            </span>
          </CardTitle>
          <Streamed fallback={<RowsSkeleton rows={4} />}>
            {() => topChoices()}
          </Streamed>
        </Card>
      </div>
    </>
  );
}

/** The top choices and the locations that could join them. */
async function topChoices() {
  const [choices, candidates] = await Promise.all([
    listTopChoices(),
    listTopChoiceCandidates(),
  ]);
  return <TopChoiceControl choices={choices} candidates={candidates} />;
}
