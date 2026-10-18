import { listTopChoiceCandidates, listTopChoices } from "@repo/db/server";
import { PageHeader } from "../../_components/PageHeader";
import { SectionHeader } from "../../_components/SectionHeader";
import { Streamed, TileGridSkeleton } from "../../_components/Skeleton";
import { requireAdmin } from "../../_lib/access";
import { TopChoiceControl } from "./TopChoiceControl";

/**
 * Route: /home-page. What Marketing sets on the customer site's home page:
 * the top choices, the location cards beside the airport's, shown as the
 * cards they become. Anything else the home page comes to need from
 * Marketing belongs here. Behind `locations.manage`. See
 * docs/261003-location-flow.md.
 */
export default async function HomePageScreen() {
  await requireAdmin("locations.manage");

  return (
    <>
      <PageHeader
        title="Home page"
        description="What the customer site's home page shows from Marketing."
      />

      <div className="mt-8">
        <SectionHeader
          title="Top choices"
          description="The location cards on the home page, in this order, after the airport card. Each shows the location's name and its main page's tagline and hero image, and opens the location's page."
        />
        <div className="mt-5">
          <Streamed fallback={<TileGridSkeleton min="thirds" />}>
            {() => topChoices()}
          </Streamed>
        </div>
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
