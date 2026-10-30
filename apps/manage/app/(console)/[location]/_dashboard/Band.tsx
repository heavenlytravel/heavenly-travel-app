import Link from "next/link";
import {
  andList,
  localDateTimeInputs,
  plural,
  todayInMalaysia,
} from "@repo/db";
import { cx } from "@repo/ui/cx";
import {
  CalendarIcon,
  IdCardIcon,
  InboxIcon,
  TriangleAlertIcon,
} from "@repo/ui/icons";
import type { ReactNode } from "react";
import type { AdminUser } from "../../../_lib/access";
import { scopeOverviews } from "../../../_lib/location-data";
import {
  bookingsHref,
  driversHref,
  vehiclesHref,
  type ScopeSlug,
} from "../../../_lib/routes";
import {
  AWAITING_DRIVER,
  DOCUMENTS,
  DRIVERS_DUE,
  PICKUPS,
  RECEIVED,
  VEHICLES_DUE,
  mayIn,
  splitOf,
  sumOf,
  type Day,
} from "./day";

/** "Good morning, Fikri" by the Malaysian clock; without a first name, the greeting alone. */
export function greetingOf(admin: AdminUser, now: Date) {
  const hour = Number(localDateTimeInputs(now).time.slice(0, 2));
  const part = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const name = admin.firstName?.trim();
  return name ? `Good ${part}, ${name}` : `Good ${part}`;
}

/** The documents due, by what they are on: "2 vehicles and 1 driver"; nothing while none is. */
function documentsLine(vehicles: number, drivers: number) {
  const parts = [
    vehicles > 0 ? plural(vehicles, "vehicle") : null,
    drivers > 0 ? plural(drivers, "driver") : null,
  ].filter((part) => part !== null);
  return parts.length > 0 ? andList(parts) : undefined;
}

/** The list of the documents due: the vehicles', or the drivers' when only theirs are. */
function documentsHref(scope: ScopeSlug, vehicles: number, drivers: number) {
  return vehicles === 0 && drivers > 0
    ? driversHref(scope, { due: true })
    : vehiclesHref(scope, { due: true });
}

/** One of the band's four figures. */
type BandFigure = {
  key: string;
  label: string;
  icon: ReactNode;
  value: number;
  /** The figure by location under `~`, or what it is made of. */
  line?: string;
  /** The list behind it, for an admin who may open it. */
  href?: string;
  /** Something waits on it: lit amber while it counts any. */
  waits?: boolean;
};

/**
 * The dashboard's head, alone in navy: the date, the greeting, "New
 * booking" for the teams that enter them, and the day's four figures in
 * glass tiles. It is the page's header: its greeting is the title, and
 * under a location the location's name leads the date over it.
 */
export function Band({
  date,
  greeting,
  action,
  children,
}: {
  /** The day, and under a location its name first: "Langkawi · Thursday, 29 October". */
  date: string;
  greeting: string;
  action: ReactNode;
  /** The figures. */
  children: ReactNode;
}) {
  return (
    <section className="@container mb-6 rounded-2xl bg-band p-5 text-white shadow-band md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-kicker text-azure-light uppercase">
            {date}
          </p>
          <h1 className="mt-1.5 font-serif text-figure leading-display md:text-4xl">
            {greeting}
          </h1>
        </div>
        {action}
      </div>
      <div className="mt-5 md:mt-6">{children}</div>
    </section>
  );
}

const FIGURES_GRID = "grid grid-cols-2 gap-3 @3xl:grid-cols-4 @3xl:gap-4";

/** The band's four figures, summed over the scope. */
export async function bandFigures({ scope, permissions, now }: Day) {
  const overviews = await scopeOverviews(scope);
  const may = mayIn(permissions);
  const queue = may("bookings.view");
  const vehicles = sumOf(overviews, VEHICLES_DUE);
  const drivers = sumOf(overviews, DRIVERS_DUE);
  const figures: BandFigure[] = [
    {
      key: "pickups",
      label: "Pick-ups today",
      icon: <CalendarIcon />,
      value: sumOf(overviews, PICKUPS),
      line: splitOf(overviews, PICKUPS),
      href: queue
        ? bookingsHref(scope.slug, { date: todayInMalaysia(now) })
        : undefined,
    },
    {
      key: "received",
      label: "Received",
      icon: <InboxIcon />,
      value: sumOf(overviews, RECEIVED),
      line: splitOf(overviews, RECEIVED),
      href: queue
        ? bookingsHref(scope.slug, { status: "received" })
        : undefined,
      waits: true,
    },
    {
      key: "driver",
      label: "Awaiting a driver",
      icon: <IdCardIcon />,
      value: sumOf(overviews, AWAITING_DRIVER),
      line: splitOf(overviews, AWAITING_DRIVER),
      href: queue
        ? bookingsHref(scope.slug, { status: "confirmed" })
        : undefined,
      waits: true,
    },
    {
      key: "documents",
      label: "Documents due",
      icon: <TriangleAlertIcon />,
      value: vehicles + drivers,
      line: splitOf(overviews, DOCUMENTS) ?? documentsLine(vehicles, drivers),
      href: may("fleet.manage")
        ? documentsHref(scope.slug, vehicles, drivers)
        : undefined,
      waits: true,
    },
  ];

  return (
    <ul className={FIGURES_GRID}>
      {figures.map((figure) => (
        <li key={figure.key} className="min-w-0">
          <BandFigureTile figure={figure} />
        </li>
      ))}
    </ul>
  );
}

/** One figure in glass on the navy: its name, its number, and its line. */
function BandFigureTile({ figure }: { figure: BandFigure }) {
  const lit = figure.waits && figure.value > 0;
  const body = (
    <>
      <span className="flex items-center gap-2.5 text-caption font-medium text-white/85">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-azure-light @max-3xl:hidden">
          {figure.icon}
        </span>
        <span className="truncate">{figure.label}</span>
      </span>
      <span className="mt-2.5 block font-serif text-3xl leading-none tabular-nums @3xl:text-4xl">
        {figure.value}
      </span>
      <span
        className={cx(
          "mt-2 block h-5 truncate text-caption @max-3xl:hidden",
          lit ? "text-warning-edge" : "text-white/75",
        )}
      >
        {figure.line}
      </span>
    </>
  );
  const classes = cx(
    "block h-full rounded-xl border px-4 py-3.5 @3xl:p-5",
    lit
      ? "border-warning-edge/60 bg-warning-edge/7"
      : "border-white/15 bg-white/6",
  );
  return figure.href ? (
    <Link
      href={figure.href}
      className={cx(
        classes,
        "transition-colors hover:bg-white/12 focus-ring focus-ring-dark",
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

/** The four glass tiles while their figures load. */
export function BandFiguresSkeleton() {
  return (
    <div className={FIGURES_GRID}>
      {Array.from({ length: 4 }, (_, tile) => (
        <div
          key={tile}
          className="h-[5.5rem] rounded-xl border border-white/10 bg-white/6 @3xl:h-[8.75rem]"
        />
      ))}
    </div>
  );
}
