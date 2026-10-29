import Link from "next/link";
import { TRIP_CATEGORIES } from "@repo/db";
import {
  listPicturedOfferings,
  type LocationName,
  type PicturedOffering,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { BusIcon } from "@repo/ui/icons";
import { TILE_LINK, Tile, TileFoot } from "@repo/console/Card";
import { Streamed } from "@repo/console/Skeleton";
import { ServiceBadge } from "@repo/console/StatusBadges";
import { CardImage } from "../../../../../_components/CardImage";
import {
  RATES_PAGE_LABELS,
  classHref,
  classesHref,
  ratesHref,
} from "../../../../../_lib/routes";
import {
  ClassCategoriesSkeleton,
  ClassCategory,
} from "../_catalogue/ClassCategory";
import { seatsText } from "../_catalogue/class-text";
import { OfferingActiveSwitch } from "./OfferingControls";

/**
 * A location's classes, the classes under its slug and the setup's step
 * of them: what it sells, by category, a card each with its picture
 * here, the catalogue's seats and luggage, its switch and its editor.
 * Their rates here are read on Rates; the rest of each class is the
 * catalogue's. Operation changes them (`manages`, `coverage.manage`);
 * Reservation and Sales read them, without the switch or the editor.
 */
export function Offerings({
  location,
  manages,
}: {
  location: LocationName;
  manages: boolean;
}) {
  return (
    <>
      <Streamed fallback={<ClassCategoriesSkeleton />}>
        {async () => {
          const offerings = await listPicturedOfferings(location.id);
          return (
            <div className="grid gap-8">
              {TRIP_CATEGORIES.map((category) => {
                const ofCategory = offerings.filter(
                  (o) => o.vehicleClass.category === category,
                );
                const onSale = ofCategory.filter((o) => o.isActive).length;
                return (
                  <ClassCategory
                    key={category}
                    category={category}
                    meta={`${onSale} of ${ofCategory.length} on sale`}
                    tip="Off hides the class from this location's options page and search card. Bookings already made are not changed."
                    emptyMessage={
                      ofCategory.length === 0
                        ? "No class of this category is sold here, so its tab has nothing to offer at this location."
                        : null
                    }
                  >
                    {ofCategory.map((offering) => (
                      <OfferingCard
                        key={offering.id}
                        slug={location.slug}
                        offering={offering}
                        manages={manages}
                        lastOnSale={offering.isActive && onSale === 1}
                      />
                    ))}
                  </ClassCategory>
                );
              })}
            </div>
          );
        }}
      </Streamed>
      <p className="mt-8 text-sm text-muted">
        The name, picture, seats and luggage are the same everywhere, set in the{" "}
        <Link
          href={classesHref(null)}
          className="font-semibold text-ink underline-offset-4 hover:underline"
        >
          class catalogue
        </Link>
        ; what each costs here is in Rates,{" "}
        <Link
          href={ratesHref(location.slug, "classes")}
          className="font-semibold text-ink underline-offset-4 hover:underline"
        >
          {RATES_PAGE_LABELS.classes}
        </Link>
        .
      </p>
    </>
  );
}

/**
 * One class at this location: its picture here, as customers see it, then
 * its name over the catalogue's seats and luggage, the switch that puts it
 * on sale here, and its editor. The whole card opens the editor; off, it
 * is in grey. Read only, the switch is a chip and there is no editor.
 */
function OfferingCard({
  slug,
  offering,
  manages,
  lastOnSale,
}: {
  slug: string;
  offering: PicturedOffering;
  manages: boolean;
  /** It is the last of its category on sale here, so turning it off asks first. */
  lastOnSale: boolean;
}) {
  const { vehicleClass } = offering;
  const href = classHref(slug, offering.id);

  return (
    <Tile dim={!offering.isActive || !vehicleClass.isActive}>
      <CardImage
        src={offering.coverUrl}
        fit="contain"
        sizes="(min-width: 1024px) 16rem, (min-width: 640px) 50vw, 100vw"
        fallback={<BusIcon className="size-7 text-muted" />}
      />
      <div className="grid gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
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
          </div>
          {/* Above the card's link, so it switches instead of opening. */}
          <div className="relative z-1 shrink-0">
            {manages ? (
              <OfferingActiveSwitch
                offering={offering}
                lastOnSaleInCategory={lastOnSale}
              />
            ) : (
              <ServiceBadge
                active={offering.isActive}
                on="On sale"
                off="Off sale"
              />
            )}
          </div>
        </div>
        {!vehicleClass.isActive ? (
          <p className="text-xs text-warning">
            Off in the catalogue, so sold nowhere.
          </p>
        ) : null}
      </div>
      {manages ? (
        <TileFoot>
          <Button asChild variant="secondary" size="sm">
            <Link href={href}>Edit</Link>
          </Button>
          <span className="ml-auto text-xs text-muted">
            {offering.isActive ? "On sale" : "Off sale"}
          </span>
        </TileFoot>
      ) : null}
    </Tile>
  );
}
