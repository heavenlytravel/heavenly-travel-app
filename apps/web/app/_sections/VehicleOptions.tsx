import Image from "next/image";
import type { PageSectionOf } from "@repo/db";
import type { ClassCard } from "@repo/db/server";
import { SuitcaseIcon, UsersIcon } from "@repo/ui/icons";
import { photoZoom } from "../_components/page-parts";
import { SectionShell, type SectionLook } from "./SectionShell";

/** The seats a class takes, as a range when it has one: "4–6". */
function seatsOf({ minPassengers, maxPassengers }: ClassCard) {
  return minPassengers > 0 && minPassengers < maxPassengers
    ? `${minPassengers}–${maxPassengers}`
    : `${maxPassengers}`;
}

/**
 * The classes Marketing picked, in its order, as the catalogue has them:
 * the cover photo, the name, the seats and the luggage. No button: the
 * search card at the top of the page books them.
 */
export function VehicleOptions({
  look,
  section,
  classes,
}: {
  look: SectionLook;
  section: PageSectionOf<"vehicles">;
  classes: readonly ClassCard[];
}) {
  return (
    <SectionShell look={look} id="vehicles" section={section}>
      <ul className="mx-auto grid max-w-[1240px] gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((c) => (
          <li
            key={c.id}
            className="group overflow-hidden rounded-card border border-card-edge bg-white"
          >
            <div className="relative aspect-[16/10] bg-mist">
              {c.imageUrls[0] && (
                <Image
                  src={c.imageUrls[0]}
                  alt=""
                  fill
                  sizes="(min-width: 64rem) 400px, (min-width: 40rem) 50vw, 100vw"
                  className={photoZoom}
                />
              )}
            </div>
            <div className="p-5">
              <h3 className="font-serif text-2xl leading-tight text-ink">
                {c.name}
              </h3>
              <p className="mt-3 flex flex-wrap gap-2 text-caption font-semibold text-body">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1">
                  <UsersIcon aria-hidden className="size-4 text-brand" />
                  {seatsOf(c)} passengers
                </span>
                {c.luggage && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1">
                    <SuitcaseIcon aria-hidden className="size-4 text-brand" />
                    {c.luggage}
                  </span>
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
