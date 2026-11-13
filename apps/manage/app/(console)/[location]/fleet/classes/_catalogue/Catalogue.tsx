import Link from "next/link";
import {
  TRIP_CATEGORIES,
  formatLocalDate,
  formatMyr,
  plural,
  type MadeOrder,
} from "@repo/db";
import { listVehicleClasses, type CatalogueClass } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { BusIcon } from "@repo/ui/icons";
import { Tile, TileFoot } from "@repo/console/Card";
import { LocationMark } from "@repo/console/LocationMark";
import { Streamed } from "@repo/console/Skeleton";
import { ServiceBadge } from "@repo/console/StatusBadges";
import { AddedSortLink } from "../../../../../_components/AddedColumn";
import { CardImage } from "../../../../../_components/CardImage";
import { classesHref, classHref, ratesHref } from "../../../../../_lib/routes";
import { ClassCategoriesSkeleton, ClassCategory } from "./ClassCategory";
import { seatsText } from "./class-text";
import {
  VehicleClassActiveSwitch,
  VehicleClassMoveButtons,
} from "./VehicleClassControls";

/**
 * The class catalogue, the classes under `~`: what each class is, a card
 * each by category, with its picture, seats and luggage, and the
 * locations that sell it with its rates and its vehicles in service at
 * each, a link to that location's class rates. One Sedan for every
 * location, so the customer sees the same name wherever they book, and a
 * picture of the vehicles based there. Operation adds, edits and switches
 * (`manages`, `coverage.manage`); Reservation and Sales read it. Classes
 * are never deleted, only turned off; a booking keeps its snapshot of the
 * class. Each category in the catalogue's order, or by when each was
 * added (`order`), the cards then saying when. See
 * docs/261018-location-work-and-class-catalogue.md.
 */
export function Catalogue({
  manages,
  order,
}: {
  manages: boolean;
  /** None for the catalogue's order. */
  order?: MadeOrder;
}) {
  return (
    <>
      <div className="mb-4 flex items-center justify-end gap-4">
        {order ? (
          <Link
            href={classesHref(null)}
            scroll={false}
            className="rounded-sm text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline focus-ring"
          >
            Catalogue Order
          </Link>
        ) : null}
        <AddedSortLink
          sort={{ order, hrefOf: (next) => classesHref(null, next) }}
        />
      </div>
      <CatalogueClasses manages={manages} order={order} />
    </>
  );
}

function CatalogueClasses({
  manages,
  order,
}: {
  manages: boolean;
  order?: MadeOrder;
}) {
  return (
    <Streamed key={order ?? ""} fallback={<ClassCategoriesSkeleton />}>
      {async () => {
        const classes = await listVehicleClasses(order);
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
                  {ofCategory.map((vehicleClass, index) => (
                    <ClassCard
                      key={vehicleClass.id}
                      vehicleClass={vehicleClass}
                      manages={manages}
                      showsAdded={order !== undefined}
                      lastActive={vehicleClass.isActive && active === 1}
                      // The arrows move the catalogue's order, not shown while sorted by when added.
                      place={
                        order
                          ? null
                          : {
                              first: index === 0,
                              last: index === ofCategory.length - 1,
                            }
                      }
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
  showsAdded,
  lastActive,
  place,
}: {
  vehicleClass: CatalogueClass;
  /** Where it stands in its category, for the arrows; null while the list is sorted otherwise. */
  place: { first: boolean; last: boolean } | null;
  manages: boolean;
  /** While the catalogue is by when each was added. */
  showsAdded: boolean;
  /** The last active class of its category, so turning it off asks first. */
  lastActive: boolean;
}) {
  const href = classHref(null, vehicleClass.id);
  const { offerings } = vehicleClass;

  return (
    <Tile dim={!vehicleClass.isActive}>
      <CardImage
        src={vehicleClass.imageUrls[0] ?? null}
        frame="class"
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
              <Link href={href} className="card-link">
                {vehicleClass.name}
              </Link>
            ) : (
              vehicleClass.name
            )}
          </h3>
          <p className="text-xs text-muted">
            {seatsText(vehicleClass)} passengers · {vehicleClass.luggage}
            {showsAdded
              ? ` · Added ${formatLocalDate(vehicleClass.createdAt)}`
              : null}
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
            <ul className="relative z-(--layer-raised) -mx-2 mt-1 grid">
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
                        <span className="text-xs font-normal">Off Sale</span>
                      )}
                      <span className="ml-auto text-xs font-normal text-muted tabular-nums">
                        {plural(
                          vehicleClass.inServiceAt[offering.location.id] ?? 0,
                          "vehicle",
                        )}
                      </span>
                    </span>
                    <span className="col-start-2 text-xs text-muted tabular-nums">
                      {formatMyr(offering.perKmSen)} per extra km
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
            {place ? (
              <VehicleClassMoveButtons
                vehicleClass={vehicleClass}
                first={place.first}
                last={place.last}
              />
            ) : null}
          </>
        ) : (
          <ServiceBadge active={vehicleClass.isActive} on="Active" off="Off" />
        )}
      </TileFoot>
    </Tile>
  );
}
