import Link from "next/link";
import {
  LOCATION_PAGE_LABELS,
  LOCATION_STATE_MOVES,
  isLocationState,
  isPlace,
  isPublicState,
  isSlugLocked,
  stateMoveBlockers,
  type LocationState,
} from "@repo/db";
import {
  getLocation,
  listActivityFor,
  listTopChoices,
  type ActivityEntry,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { ActivityHistory } from "../../../_components/ActivityHistory";
import { Card, CardTitle } from "../../../_components/Card";
import { PageHeader } from "../../../_components/PageHeader";
import { Rows } from "../../../_components/Rows";
import {
  LocationStateBadge,
  PageStatusBadge,
} from "../../../_components/StatusBadges";
import { requireAdmin } from "../../../_lib/access";
import {
  LOCATIONS_PATH,
  locationPageHref,
  locationPublishHref,
} from "../../../_lib/routes";
import { PreviewLink } from "../_components/PreviewLink";
import { districtOptions } from "../_lib/district-options";
import { LocationDetailsForm } from "./LocationDetailsForm";
import { PageSwitch } from "./PageSwitch";
import { SavedAddresses, type SavedAddress } from "./SavedAddresses";
import { StateControls } from "./StateControls";
import { TopChoiceControl } from "./TopChoiceControl";

/** What each state means for the public, under the badge. */
const STATE_NOTES: Record<LocationState, string> = {
  draft: "Not public. The pages are still being written.",
  preview: "Not public. Staff check the pages before they go live.",
  live: "Public: the pages that are on are open to everyone.",
  paused:
    "Public, with a notice in place of the search card. Not sold for now.",
};

/**
 * Route: /locations/[id]. One location for Marketing: its details, its
 * saved addresses, its pages with their switches, its state and the moves
 * it allows, its place among the home page's top choices, its history, and
 * whether pickups are served in each of its districts, as information.
 * "Preview" opens its drafts on the customer site.
 */
export default async function LocationPage({
  params,
}: PageProps<"/locations/[id]">) {
  await requireAdmin("locations.manage");
  const { id } = await params;
  const [location, districts, topChoices, history] = await Promise.all([
    getLocation(id),
    districtOptions(),
    listTopChoices(),
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
    };
  });

  const state = isLocationState(location.state) ? location.state : "draft";
  const isPublic = isPublicState(state);
  const moves = LOCATION_STATE_MOVES[state].map((to) => ({
    to,
    blockers: stateMoveBlockers(state, to, location.pages),
  }));
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
        description={`Its address on the customer site is /${location.slug}.`}
        action={<PreviewLink slug={location.slug} />}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="grid gap-6">
          <Card>
            <CardTitle>
              <span className="inline-flex items-center gap-1.5">
                Pages
                <InfoTip text="Each page has a working draft and a published copy. A page can be switched on once it is published. The switch says whether the page exists for the public, not whether the product can be booked here." />
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
                  <PageSwitch
                    locationId={location.id}
                    page={page.page}
                    isOn={page.isOn}
                    isPublic={isPublic}
                  />
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
          <Card>
            <CardTitle>
              <span className="inline-flex items-center gap-1.5">
                Saved addresses
                <InfoTip text="The places most customers go to here. The drop-off offers them before anything is typed; typing still searches any exact place. Exact spots only, never an area." />
              </span>
            </CardTitle>
            <SavedAddresses locationId={location.id} addresses={addresses} />
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardTitle>
              <span className="inline-flex items-center gap-1.5">
                State
                <InfoTip text="Draft and Preview are not public. To leave Draft, the landing page and at least one product page must be on. To go live, every page that is on must also be published as it is drafted. A location that has been live never returns to Draft: pause it instead." />
              </span>
            </CardTitle>
            <div className="grid gap-3">
              <div>
                <LocationStateBadge state={location.state} />
                <p className="mt-1.5 text-xs text-neutral-600">
                  {STATE_NOTES[state]}
                </p>
              </div>
              <StateControls
                locationId={location.id}
                name={location.name}
                state={state}
                moves={moves}
              />
            </div>
          </Card>
          <Card>
            <CardTitle>
              <span className="inline-flex items-center gap-1.5">
                Home page
                <InfoTip text="The top choices are the location cards on the home page, in this order. Each card shows the location's name, its tagline and the landing page's hero image." />
              </span>
            </CardTitle>
            <TopChoiceControl
              locationId={location.id}
              isLive={state === "live"}
              choices={topChoices}
            />
          </Card>
          <Card>
            <CardTitle>
              <span className="inline-flex items-center gap-1.5">
                Pickups
                <InfoTip text="Whether a pickup is served in each district of this location. The switches are Operation's, on the Coverage screen. They do not show or hide the pages: with pickups off, the location is still a destination we drive to." />
              </span>
            </CardTitle>
            {location.districts.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No district ticked yet.
              </p>
            ) : (
              <Rows
                rows={location.districts.map((district) => [
                  `${district.name}, ${district.state.name}`,
                  district.isActive ? "On" : "Off",
                ])}
              />
            )}
          </Card>
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
      </div>
    </>
  );
}
