import Link from "next/link";
import {
  TRIP_CATEGORIES,
  TRIP_CATEGORY_LABELS,
  formatMyr,
  type TripCategory,
} from "@repo/db";
import { listOfferings, type Offering } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { InfoTip } from "@repo/ui/info-tip";
import {
  TILE_LINK,
  Tile,
  TileFoot,
  TileGrid,
} from "../../../../_components/Card";
import { SectionHeader } from "../../../../_components/SectionHeader";
import {
  Bone,
  Streamed,
  TileGridSkeleton,
} from "../../../../_components/Skeleton";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import {
  VEHICLE_CLASSES_PATH,
  locationOfferingHref,
  newLocationOfferingHref,
} from "../../../../_lib/routes";
import { rulesText, seatsText } from "../../../vehicle-classes/_lib/class-text";
import { locationKey } from "../../_lib/location-data";
import { OfferingActiveSwitch } from "./OfferingControls";

/**
 * Route: /locations/[slug]/vehicle-classes. Operation's tab, step 2 of the
 * setup: the classes the location sells, by category, a card each with
 * the catalogue's seats and luggage, then its four rates and its three
 * rules at this location, its switch, and its editor. The rest of
 * the catalogue is on its own screen. Operation changes them
 * (`coverage.manage`); Reservation and Sales read them, without the switch
 * or the editor (`coverage.view`).
 */
export default async function LocationVehicleClassesPage({
  params,
}: PageProps<"/locations/[slug]/vehicle-classes">) {
  await requireAdmin("coverage.view");
  const { slug } = await params;
  const { id } = await locationKey(slug);
  const manages = (await getPermissions()).includes("coverage.manage");

  return (
    <>
      <SectionHeader
        title="Vehicle classes"
        description="What this location sells, at its own metered rates and under its own rules. A route with a price on the rate grid costs that price instead."
        action={
          manages ? (
            <Button asChild>
              <Link href={newLocationOfferingHref(slug)}>Add class</Link>
            </Button>
          ) : null
        }
      />
      <Streamed
        fallback={
          <div className="mt-6 grid gap-8">
            {TRIP_CATEGORIES.map((category) => (
              <div key={category}>
                <Bone className="mb-3 h-6 w-40" />
                <TileGridSkeleton image={false} />
              </div>
            ))}
          </div>
        }
      >
        {() => categories({ id, slug, manages })}
      </Streamed>
      <p className="mt-8 text-sm text-neutral-600">
        The name, seats and luggage are the same everywhere, set in the{" "}
        <Link
          href={VEHICLE_CLASSES_PATH}
          className="font-medium text-neutral-900 underline-offset-4 hover:underline"
        >
          class catalogue
        </Link>
        .
      </p>
    </>
  );
}

async function categories({
  id,
  slug,
  manages,
}: {
  id: string;
  slug: string;
  manages: boolean;
}) {
  const offerings = await listOfferings(id);
  return (
    <div className="mt-6 grid gap-8">
      {TRIP_CATEGORIES.map((category) => (
        <Category
          key={category}
          slug={slug}
          category={category}
          manages={manages}
          offerings={offerings.filter(
            (o) => o.vehicleClass.category === category,
          )}
        />
      ))}
    </div>
  );
}

/** One category: its name and how many of its classes are on sale, over their cards. */
function Category({
  slug,
  category,
  manages,
  offerings,
}: {
  slug: string;
  category: TripCategory;
  manages: boolean;
  offerings: Offering[];
}) {
  const onSale = offerings.filter((o) => o.isActive).length;
  return (
    <section className="min-w-0">
      <h3 className="mb-3 flex flex-wrap items-baseline gap-x-2 text-base font-semibold tracking-tight">
        {TRIP_CATEGORY_LABELS[category]}
        <span className="text-sm font-normal text-neutral-500">
          {onSale} of {offerings.length} on sale
        </span>
        <InfoTip text="Off hides the class from this location's options page and search card. Bookings already made are not changed." />
      </h3>
      {offerings.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
          No class of this category is sold here, so its tab has nothing to
          offer at this location.
        </p>
      ) : (
        <TileGrid>
          {offerings.map((offering) => (
            <OfferingCard
              key={offering.id}
              slug={slug}
              offering={offering}
              manages={manages}
              lastOnSale={offering.isActive && onSale === 1}
            />
          ))}
        </TileGrid>
      )}
    </section>
  );
}

/**
 * One class at this location: its name over the catalogue's seats and
 * luggage, the switch that puts it on sale here,
 * its four rates and its three rules here, and its editor. The whole card
 * opens the editor; off, it is in grey. Read only, the switch is a badge
 * and there is no editor.
 */
function OfferingCard({
  slug,
  offering,
  manages,
  lastOnSale,
}: {
  slug: string;
  offering: Offering;
  manages: boolean;
  /** It is the last of its category on sale here, so turning it off asks first. */
  lastOnSale: boolean;
}) {
  const { vehicleClass } = offering;
  const href = locationOfferingHref(slug, offering.id);
  const rates: [label: string, value: string][] = [
    ["Base fare", formatMyr(offering.baseFareSen)],
    ["Per km", formatMyr(offering.perKmSen)],
    ["Per hour", formatMyr(offering.hourlyRateSen)],
    ["Minimum fare", formatMyr(offering.minimumFareSen)],
  ];

  return (
    <Tile dim={!offering.isActive || !vehicleClass.isActive}>
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <h4 className="truncate text-base font-semibold tracking-tight">
            {manages ? (
              <Link href={href} className={TILE_LINK}>
                {vehicleClass.name}
              </Link>
            ) : (
              vehicleClass.name
            )}
          </h4>
          <p className="text-xs text-neutral-500">
            {seatsText(vehicleClass)} passengers · {vehicleClass.luggage}
          </p>
        </div>
        {/* Above the card's link, so it switches instead of opening. */}
        <div className="relative z-1 shrink-0">
          {manages ? (
            <OfferingActiveSwitch
              offering={offering}
              lastOnSaleInCategory={lastOnSale}
            />
          ) : (
            <Badge tone={offering.isActive ? "green" : "neutral"}>
              {offering.isActive ? "On sale" : "Off sale"}
            </Badge>
          )}
        </div>
      </div>
      {!vehicleClass.isActive ? (
        <p className="px-4 pt-2 text-xs text-amber-700">
          Off in the catalogue, so sold nowhere.
        </p>
      ) : null}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 pt-4">
        {rates.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-neutral-500">{label}</dt>
            <dd className="text-sm font-medium text-neutral-900 tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="px-4 pt-3 pb-4 text-xs text-neutral-600">
        {rulesText(offering)}
      </p>
      {manages ? (
        <TileFoot>
          <Button asChild variant="secondary" size="sm">
            <Link href={href}>Edit rates and rules</Link>
          </Button>
          <span className="ml-auto text-xs text-neutral-500">
            {offering.isActive ? "On sale" : "Off sale"}
          </span>
        </TileFoot>
      ) : null}
    </Tile>
  );
}
