import Link from "next/link";
import { TRIP_CATEGORIES, formatMyr, plural } from "@repo/db";
import { listVehicleClasses, type CatalogueClass } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { BusIcon } from "@repo/ui/icons";
import { TILE_LINK, Tile, TileFoot } from "@repo/console/Card";
import { LocationMark } from "@repo/console/LocationMark";
import { Streamed } from "@repo/console/Skeleton";
import { ServiceBadge } from "@repo/console/StatusBadges";
import { CardImage } from "../../../../../_components/CardImage";
import { classHref, ratesHref } from "../../../../../_lib/routes";
import { ClassCategoriesSkeleton, ClassCategory } from "./ClassCategory";
import { seatsText } from "./class-text";
import { VehicleClassActiveSwitch } from "./VehicleClassControls";

/**
 * The class catalogue, the classes under `~`: what each class is, a card
 * each by category, with its picture, seats and luggage, and the
 * locations that sell it with its rates and its vehicles in service at
 * each, a link to that location's class rates. One Sedan for every
 * location, so the customer sees the same name wherever they book, and a
 * picture of the vehicles based there. Operation adds, edits and switches
 * (`manages`, `coverage.manage`); Reservation and Sales read it. Classes
 * are never deleted, only turned off; a booking keeps its snapshot of the
 * class. See docs/261018-location-work-and-class-catalogue.md.
 */
export function Catalogue({ manages }: { manages: boolean }) {
  return (
    <Streamed fallback={<ClassCategoriesSkeleton />}>
      {async () => {
        const classes = await listVehicleClasses();
        return (
          <div className="grid gap-8">
            {TRIP_CATEGORIES.map((category) => {
              const ofCategory = classes.filter((c) => c.category === category);
              const active = ofCategory.filter((c) => c.isActive).length;
              return (
                <ClassCategory
                  key={category}
                  category={category}
                  meta={`${active} of ${ofCategory.length} active`}
                  tip="Off hides the class from every location's options page and search card. Bookings already made are not changed."
                  emptyMessage={
                    ofCategory.length === 0
                      ? "No class in this category, so its tab has nothing to sell."
                      : null
                  }
                >
                  {ofCategory.map((vehicleClass) => (
                    <ClassCard
                      key={vehicleClass.id}
                      vehicleClass={vehicleClass}
                      manages={manages}
                      lastActive={vehicleClass.isActive && active === 1}
                    />
                  ))}
                </ClassCategory>
              );
            })}
          </div>
        );
      }}
    </Streamed>
  );
}

/**
 * One class: its picture, its name over its seats and luggage, its line,
 * and where it is sold, each location with the class's rate per extra
 * km and per hour there and how many of its vehicles are in service
 * there, in grey where it is off sale. For Operation the whole card opens
 * the editor and the foot holds the switch; off, it is in grey.
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
  const href = classHref(null, vehicleClass.id);
  const { offerings } = vehicleClass;

  return (
    <Tile dim={!vehicleClass.isActive}>
      <CardImage
        src={vehicleClass.imageUrl}
        fit="contain"
        sizes="(min-width: 1024px) 16rem, (min-width: 640px) 50vw, 100vw"
        fallback={
          <span className="grid justify-items-center gap-1.5 text-xs text-muted">
            <BusIcon className="size-7" />
            No picture yet
          </span>
        }
      />
      <div className="grid gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold tracking-tight text-ink">
            {manages ? (
              <Link href={href} className={TILE_LINK}>
                {vehicleClass.name}
              </Link>
            ) : (
              vehicleClass.name
            )}
          </h3>
          <p className="text-xs text-muted">
            {seatsText(vehicleClass)} passengers · {vehicleClass.luggage}
          </p>
          <p className="mt-1.5 line-clamp-2 text-sm text-body">
            {vehicleClass.description}
          </p>
        </div>
        <div>
          <p className="text-caps font-semibold text-muted">Sold in</p>
          {offerings.length === 0 ? (
            <p className="mt-1 text-sm text-muted">No location yet</p>
          ) : (
            // Above the card's link, so each row opens its location's rates.
            <ul className="relative z-1 -mx-2 mt-1 grid">
              {offerings.map((offering) => (
                <li key={offering.id}>
                  <Link
                    href={ratesHref(offering.location.slug, "classes")}
                    className={cx(
                      "grid grid-cols-[auto_1fr] items-center gap-x-2 rounded-md px-2 py-1 transition-colors hover:bg-hover",
                      offering.isActive ? "text-ink" : "text-muted",
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
                      <span className="ml-auto text-xs font-normal text-muted tabular-nums">
                        {plural(
                          vehicleClass.inServiceAt[offering.location.id] ?? 0,
                          "vehicle",
                        )}
                      </span>
                    </span>
                    <span className="col-start-2 text-xs text-muted tabular-nums">
                      {formatMyr(offering.perKmSen)} per extra km ·{" "}
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
          <ServiceBadge active={vehicleClass.isActive} on="Active" off="Off" />
        )}
      </TileFoot>
    </Tile>
  );
}
