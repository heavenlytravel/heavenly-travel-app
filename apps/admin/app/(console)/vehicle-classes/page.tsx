import Link from "next/link";
import {
  TRIP_CATEGORIES,
  TRIP_CATEGORY_LABELS,
  formatMyr,
  modelsLine,
  type TripCategory,
} from "@repo/db";
import { listVehicleClasses, type CatalogueClass } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { BusIcon } from "@repo/ui/icons";
import { InfoTip } from "@repo/ui/info-tip";
import { TILE_LINK, Tile, TileFoot, TileGrid } from "../../_components/Card";
import { CardImage } from "../../_components/CardImage";
import { LocationMark } from "../../_components/LocationMark";
import { PageHeader } from "../../_components/PageHeader";
import { Bone, Streamed, TileGridSkeleton } from "../../_components/Skeleton";
import { getPermissions, requireAdmin } from "../../_lib/access";
import {
  NEW_VEHICLE_CLASS_PATH,
  ratesHref,
  vehicleClassHref,
} from "../../_lib/routes";
import { seatsText } from "./_lib/class-text";
import { VehicleClassActiveSwitch } from "./VehicleClassControls";

/**
 * Route: /vehicle-classes. The catalogue: what each class is, a card each
 * by category, with its picture, seats and luggage, and the locations
 * that sell it with its metered rates at each, a link to that location on
 * the Rates screen. One Sedan for every location, so the customer
 * sees the same name and picture wherever they book. Operation's screen,
 * behind `coverage.manage` for adding, editing and the switch; Reservation
 * and Sales read it behind `coverage.view`. Classes are never deleted,
 * only turned off; a booking keeps its snapshot of the class. See
 * docs/261018-location-work-and-class-catalogue.md.
 */
export default async function VehicleClassesPage() {
  await requireAdmin("coverage.view");
  const manages = (await getPermissions()).includes("coverage.manage");

  return (
    <>
      <PageHeader
        title="Vehicle classes"
        description="The catalogue: what each class is, its picture, seats and luggage. Each location sells the classes it offers at its own rates and under its own rules."
        action={
          manages ? (
            <Button asChild>
              <Link href={NEW_VEHICLE_CLASS_PATH}>Add class</Link>
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
                <TileGridSkeleton />
              </div>
            ))}
          </div>
        }
      >
        {() => categories({ manages })}
      </Streamed>
    </>
  );
}

/** Every class, by category. */
async function categories({ manages }: { manages: boolean }) {
  const classes = await listVehicleClasses();
  return (
    <div className="mt-6 grid gap-8">
      {TRIP_CATEGORIES.map((category) => (
        <Category
          key={category}
          category={category}
          classes={classes.filter((c) => c.category === category)}
          manages={manages}
        />
      ))}
    </div>
  );
}

/** One category: its name and how many of its classes are active, over their cards. */
function Category({
  category,
  classes,
  manages,
}: {
  category: TripCategory;
  classes: CatalogueClass[];
  /** Operation: the switch and the editor. The other teams read. */
  manages: boolean;
}) {
  const activeCount = classes.filter((c) => c.isActive).length;
  return (
    <section className="min-w-0">
      <h2 className="mb-3 flex flex-wrap items-baseline gap-x-2 text-base font-semibold tracking-tight">
        {TRIP_CATEGORY_LABELS[category]}
        <span className="text-sm font-normal text-neutral-500">
          {activeCount} of {classes.length} active
        </span>
        <InfoTip text="Off hides the class from every location's options page and search card. Bookings already made are not changed." />
      </h2>
      {classes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
          No class in this category, so its tab has nothing to sell.
        </p>
      ) : (
        <TileGrid>
          {classes.map((vehicleClass) => (
            <ClassCard
              key={vehicleClass.id}
              vehicleClass={vehicleClass}
              manages={manages}
              lastActive={vehicleClass.isActive && activeCount === 1}
            />
          ))}
        </TileGrid>
      )}
    </section>
  );
}

/**
 * One class: its picture, its name over its seats and luggage, its line,
 * the models customers see, and where it is sold, each location with the class's base fare, per km
 * and per hour there, in grey where it is off sale.
 * For Operation the whole card opens the editor and the foot holds the
 * switch; off, it is in grey.
 */
function ClassCard({
  vehicleClass,
  manages,
  lastActive,
}: {
  vehicleClass: CatalogueClass;
  manages: boolean;
  /** The last active class of its category, so turning it off asks first. */
  lastActive: boolean;
}) {
  const href = vehicleClassHref(vehicleClass.id);
  const { offerings } = vehicleClass;

  return (
    <Tile dim={!vehicleClass.isActive}>
      <CardImage
        src={vehicleClass.imageUrl}
        fit="contain"
        sizes="(min-width: 1024px) 16rem, (min-width: 640px) 50vw, 100vw"
        fallback={
          <span className="grid justify-items-center gap-1.5 text-xs">
            <BusIcon className="size-7 text-neutral-300" />
            No picture yet
          </span>
        }
      />
      <div className="grid gap-3 px-4 pt-4 pb-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-tight">
            {manages ? (
              <Link href={href} className={TILE_LINK}>
                {vehicleClass.name}
              </Link>
            ) : (
              vehicleClass.name
            )}
          </h3>
          <p className="text-xs text-neutral-500">
            {seatsText(vehicleClass)} passengers · {vehicleClass.luggage}
          </p>
          <p className="mt-1.5 line-clamp-2 text-sm text-neutral-600">
            {vehicleClass.description}
          </p>
          <p className="mt-1.5 text-xs text-neutral-500">
            {vehicleClass.models.length > 0
              ? modelsLine(vehicleClass.models)
              : "No model yet"}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Sold in</p>
          {offerings.length === 0 ? (
            <p className="mt-1 text-sm text-neutral-500">No location yet</p>
          ) : (
            // Above the card's link, so each row opens its location's rates.
            <ul className="relative z-1 mt-1 -mx-2 grid">
              {offerings.map((offering) => (
                <li key={offering.id}>
                  <Link
                    href={ratesHref(offering.location.id)}
                    className={cx(
                      "grid grid-cols-[auto_1fr] items-center gap-x-2 rounded-md px-2 py-1 transition-colors hover:bg-neutral-50",
                      offering.isActive
                        ? "text-neutral-900"
                        : "text-neutral-400",
                    )}
                  >
                    <LocationMark
                      name={offering.location.name}
                      state={offering.location.state}
                    />
                    <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                      <span className="truncate">{offering.location.name}</span>
                      {offering.isActive ? null : (
                        <span className="text-xs font-normal">Off sale</span>
                      )}
                    </span>
                    <span className="col-start-2 text-xs text-neutral-500 tabular-nums">
                      {formatMyr(offering.baseFareSen)} +{" "}
                      {formatMyr(offering.perKmSen)}/km ·{" "}
                      {formatMyr(offering.hourlyRateSen)}/h
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <TileFoot>
        {manages ? (
          <>
            <VehicleClassActiveSwitch
              vehicleClass={vehicleClass}
              lastActiveInCategory={lastActive}
            />
            <Button asChild variant="secondary" size="sm" className="ml-auto">
              <Link href={href}>Edit</Link>
            </Button>
          </>
        ) : (
          <Badge tone={vehicleClass.isActive ? "green" : "neutral"}>
            {vehicleClass.isActive ? "Active" : "Off"}
          </Badge>
        )}
      </TileFoot>
    </Tile>
  );
}
