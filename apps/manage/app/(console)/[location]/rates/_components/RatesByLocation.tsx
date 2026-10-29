import Link from "next/link";
import type { ReactNode } from "react";
import { CARD_LINK } from "@repo/console/Card";
import { LocationMark } from "@repo/console/LocationMark";
import { SectionHeader } from "@repo/console/SectionHeader";
import { LocationStateBadge } from "@repo/console/StatusBadges";

type Located = { id: string; name: string; slug: string; state: string };

/**
 * A page of Rates under `~`: each location the person may see under its
 * name, its part of the rates read only, as `children` draws it. The name
 * opens the same page in the location; for Operation (`coverage.manage`)
 * "Edit" says so, since the rates are changed there.
 */
export function RatesByLocation<Location extends Located>({
  locations,
  hrefOf,
  manages,
  children,
}: {
  locations: readonly Location[];
  /** The same page in a location, by its slug. */
  hrefOf: (slug: string) => string;
  manages: boolean;
  children: (location: Location) => ReactNode;
}) {
  if (locations.length === 0) {
    return <p className="text-sm text-muted">No location yet.</p>;
  }
  return (
    <div className="grid gap-8">
      {locations.map((location) => (
        <section
          key={location.id}
          aria-label={location.name}
          className="grid min-w-0 gap-3"
        >
          <SectionHeader
            title={
              <span className="flex items-center gap-2.5">
                <LocationMark
                  name={location.name}
                  state={location.state}
                  size="lg"
                />
                <Link
                  href={hrefOf(location.slug)}
                  className="underline-offset-4 hover:underline"
                >
                  {location.name}
                </Link>
              </span>
            }
            badge={<LocationStateBadge state={location.state} />}
            action={
              manages ? (
                <Link
                  href={hrefOf(location.slug)}
                  aria-label={`Edit ${location.name}'s rates`}
                  className={CARD_LINK}
                >
                  Edit
                </Link>
              ) : null
            }
          />
          {children(location)}
        </section>
      ))}
    </div>
  );
}
