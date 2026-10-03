import Link from "next/link";
import {
  LOCATION_MOVE_LABELS,
  LOCATION_PAGE_LABELS,
  LOCATION_STATE_MOVE,
  hasBeenLive,
  isPlace,
  isSlugLocked,
  locationStateOf,
  stateMoveBlockers,
  type LocationState,
} from "@repo/db";
import {
  getLocation,
  listActivityFor,
  type ActivityEntry,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { ActivityHistory } from "../../../_components/ActivityHistory";
import { Card, CardTitle } from "../../../_components/Card";
import { PageHeader } from "../../../_components/PageHeader";
import {
  LocationStateBadge,
  PageStatusBadge,
} from "../../../_components/StatusBadges";
import { requireAdmin } from "../../../_lib/access";
import {
  LOCATIONS_PATH,
  SAVED_ADDRESSES_ID,
  locationPageHref,
  locationPublishHref,
} from "../../../_lib/routes";
import { PreviewLink } from "../_components/PreviewLink";
import { districtOptions } from "../_lib/district-options";
import { DeleteLocation } from "./DeleteLocation";
import { LocationDetailsForm } from "./LocationDetailsForm";
import { SavedAddresses, type SavedAddress } from "./SavedAddresses";
import { StateMove } from "./StateMove";

/** What each state means for the public, under the name. */
function stateNote(state: LocationState, slug: string) {
  switch (state) {
    case "draft":
      return `Not public yet. Its address on the customer site will be /${slug}.`;
    case "live":
      return `Public at /${slug} on the customer site.`;
    case "paused":
      return `Public at /${slug} on the customer site, with a notice in place of the search card. Not sold for now.`;
  }
}

/**
 * Route: /locations/[id]. One location for Marketing. The header carries
 * its state, the one move the state allows and "Preview", which opens its
 * drafts on the customer site; while the move is blocked, a line under the
 * header says what to do first. Below: its pages, each with its status,
 * its details with the districts it lies in, its saved addresses and its
 * history. A page is published and unpublished in its editor. The home
 * page's top choices are on the Home page screen. At the foot, the location
 * can be deleted: on a plain yes while it has never been live, and by typing
 * its slug once it has.
 */
export default async function LocationPage({
  params,
}: PageProps<"/locations/[id]">) {
  await requireAdmin("locations.manage");
  const { id } = await params;
  const [location, districts, history] = await Promise.all([
    getLocation(id),
    districtOptions(),
    listActivityFor("location", id),
  ]);
  if (!location) notFound();

  const addresses: SavedAddress[] = location.addresses.map((address) => {
    const spot = isPlace(address.place) ? address.place : null;
    return {
      id: address.id,
      name: address.name,
      placeId: spot?.placeId ?? "",
      placeLabel: spot?.label ?? "",
      placeAddress: spot?.address ?? "",
      usedBy: address.usedBy,
      isStray: address.isStray,
    };
  });

  const state = locationStateOf(location.state);
  const blockers = stateMoveBlockers(
    state,
    LOCATION_STATE_MOVE[state],
    location.pages,
  );
  const publishHref = (entry: ActivityEntry) =>
    entry.action === "location.page.published"
      ? locationPublishHref(location.id, entry.id)
      : null;

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
        title={location.name}
        badge={<LocationStateBadge state={state} />}
        description={stateNote(state, location.slug)}
        action={
          <div className="flex flex-wrap items-start gap-2">
            <PreviewLink slug={location.slug} />
            <StateMove
              locationId={location.id}
              name={location.name}
              state={state}
              blocked={blockers.length > 0}
            />
          </div>
        }
      />
      {blockers.length > 0 ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span className="font-medium">
            Before “{LOCATION_MOVE_LABELS[state]}”:
          </span>{" "}
          {blockers.join(". ")}.
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="grid gap-6">
          <Card>
            <CardTitle>
              <span className="inline-flex items-center gap-1.5">
                Pages
                <InfoTip text="A published page is one the public can see, once the location is live. “Published, edits waiting” means the public still sees the copy last published, and the draft holds newer edits. Only the landing page is needed to go live: a product page is an extra page about one product, and the search card offers every product either way. Publish and unpublish a page in its editor." />
              </span>
            </CardTitle>
            <ul className="divide-y divide-neutral-100">
              {location.pages.map((page) => (
                <li
                  key={page.page}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3"
                >
                  <div className="min-w-40 flex-1">
                    <span className="block text-sm font-medium">
                      {LOCATION_PAGE_LABELS[page.page]}
                    </span>
                    <span className="mt-1 block">
                      <PageStatusBadge status={page.status} />
                    </span>
                  </div>
                  <Button asChild variant="secondary" size="sm">
                    <Link href={locationPageHref(location.id, page.page)}>
                      Edit
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardTitle>Details</CardTitle>
            <LocationDetailsForm
              location={{
                id: location.id,
                name: location.name,
                slug: location.slug,
                tagline: location.tagline,
                districtCodes: location.districtCodes,
                slugLocked: isSlugLocked(location),
              }}
              districts={districts}
            />
          </Card>
          <Card id={SAVED_ADDRESSES_ID} className="scroll-mt-6">
            <CardTitle>
              <span className="inline-flex items-center gap-1.5">
                Saved addresses
                <InfoTip text="The places most customers go to here. The drop-off offers them before anything is typed; typing still searches any exact place. Exact spots only, never an area, each in one of the districts ticked above." />
              </span>
            </CardTitle>
            <SavedAddresses locationId={location.id} addresses={addresses} />
          </Card>
          <Card>
            <CardTitle>Delete</CardTitle>
            <DeleteLocation
              locationId={location.id}
              name={location.name}
              slug={location.slug}
              hasBeenLive={hasBeenLive(location)}
            />
          </Card>
        </div>

        <Card>
          <CardTitle>
            <span className="inline-flex items-center gap-1.5">
              History
              <InfoTip text="Open a publish to read the page as it was before and after, and to copy the old text back." />
            </span>
          </CardTitle>
          <ActivityHistory
            entries={history}
            emptyMessage="No changes recorded for this location."
            hrefOf={publishHref}
          />
        </Card>
      </div>
    </>
  );
}
