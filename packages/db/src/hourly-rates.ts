import { logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { refuse, type Change } from "./change";
import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";
import {
  isHourlyPackage,
  packageLabel,
  type HourlyList,
  type HourlyListInput,
} from "./hourly-input";

/**
 * A location's hourly price list in the database: the reader the quote and
 * the Hourly tab share, and the tab's writer. See ./hourly-input for the
 * rules and docs/261102-booking-ops.md, "Hourly rate grid".
 */

/** What a location query includes to read its hourly list. */
export const withHourly = {
  include: {
    hourlyAreas: {
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        zones: { select: { id: true }, orderBy: { sortOrder: "asc" } },
        packages: { include: { rates: true } },
      },
    },
    hourlyExtraRates: true,
  },
} satisfies Prisma.LocationDefaultArgs;

type HourlyRows = Prisma.LocationGetPayload<typeof withHourly>;

/** The rows as the quote and the tab read them. Package sizes no longer sold are left out. */
export function hourlyListOf(
  rows: Pick<HourlyRows, "hourlyAreas" | "hourlyExtraRates">,
): HourlyList {
  return {
    areas: rows.hourlyAreas.map((area) => ({
      name: area.name,
      zoneIds: area.zones.map((zone) => zone.id),
      packages: area.packages
        .flatMap((row) =>
          isHourlyPackage(row.hours)
            ? [
                {
                  hours: row.hours,
                  includedHours: row.includedHours,
                  prices: Object.fromEntries(
                    row.rates.map((rate) => [
                      rate.vehicleClassId,
                      rate.priceSen,
                    ]),
                  ),
                },
              ]
            : [],
        )
        .sort((a, b) => a.hours - b.hours),
    })),
    extras: rows.hourlyExtraRates.flatMap((extra) =>
      isHourlyPackage(extra.packageHours)
        ? [
            {
              packageHours: extra.packageHours,
              vehicleClassId: extra.vehicleClassId,
              priceSen: extra.priceSen,
            },
          ]
        : [],
    ),
  };
}

/** A location's hourly list, for the Hourly tab; null when the location is gone. */
export async function getHourlyList(
  locationId: string,
): Promise<HourlyList | null> {
  const location = await db.location.findUnique({
    where: { id: locationId },
    select: {
      hourlyAreas: withHourly.include.hourlyAreas,
      hourlyExtraRates: true,
    },
  });
  return location ? hourlyListOf(location) : null;
}

/** Several locations' hourly lists by location id, in one query, for Rates under `~`. */
export async function listHourlyLists(
  locationIds: readonly string[],
): Promise<Map<string, HourlyList>> {
  const rows = await db.location.findMany({
    where: { id: { in: [...locationIds] } },
    select: {
      id: true,
      hourlyAreas: withHourly.include.hourlyAreas,
      hourlyExtraRates: true,
    },
  });
  return new Map(rows.map((row) => [row.id, hourlyListOf(row)]));
}

/** The list in a few words a person reads in the history: each area's packages and prices. */
function summaryOf(list: HourlyList, className: (id: string) => string) {
  return {
    areas: list.areas.map((area) => ({
      name: area.name,
      zones: area.zoneIds.length,
      packages: area.packages.map((row) => ({
        package: packageLabel(row.hours),
        includedHours: row.includedHours,
        prices: Object.fromEntries(
          Object.entries(row.prices).map(([id, sen]) => [className(id), sen]),
        ),
      })),
    })),
    extras: list.extras.map((extra) => ({
      package: packageLabel(extra.packageHours),
      class: className(extra.vehicleClassId),
      priceSen: extra.priceSen,
    })),
  };
}

/**
 * Saves a location's whole hourly list as the tab posts it, in place of
 * the one stored: the areas in their order with their zones, each
 * package that has a price in at least one class, and the extra hour
 * rates. The zones must be the location's and the classes ones it
 * offers. A booking keeps its own receipt, so nothing booked changes.
 * Saving what is already there logs nothing.
 */
export async function setHourlyList(
  actor: Actor,
  locationId: string,
  input: HourlyListInput,
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id: locationId },
      select: {
        zones: { select: { id: true } },
        offerings: {
          select: {
            vehicleClassId: true,
            vehicleClass: { select: { name: true } },
          },
        },
        ...withHourly.include,
      },
    });
    if (!location) {
      return refuse(
        "This location was deleted meanwhile. Go back to Locations.",
      );
    }
    const own = new Set(location.zones.map((zone) => zone.id));
    const names = new Map(
      location.offerings.map((o) => [o.vehicleClassId, o.vehicleClass.name]),
    );
    const className = (id: string) => names.get(id) ?? "a class";
    for (const area of input.areas) {
      if (!area.zoneIds.every((id) => own.has(id))) {
        return refuse(
          "A zone of an hourly area was deleted meanwhile. Reload.",
        );
      }
      for (const row of area.packages) {
        if (!row.prices.every((cell) => names.has(cell.vehicleClassId))) {
          return refuse(
            "A class on the list is no longer offered here. Reload.",
          );
        }
      }
    }
    if (!input.extras.every((extra) => names.has(extra.vehicleClassId))) {
      return refuse("A class on the list is no longer offered here. Reload.");
    }

    // What is stored, with a package kept only when a class has a price.
    const next: HourlyList = {
      areas: input.areas.map((area) => ({
        name: area.name,
        zoneIds: area.zoneIds,
        packages: area.packages
          .map((row) => ({
            hours: row.hours,
            includedHours: row.includedHours,
            prices: Object.fromEntries(
              row.prices.flatMap((cell) =>
                cell.priceSen === null
                  ? []
                  : [[cell.vehicleClassId, cell.priceSen] as const],
              ),
            ),
          }))
          .filter((row) => Object.keys(row.prices).length > 0)
          .sort((a, b) => a.hours - b.hours),
      })),
      extras: input.extras.flatMap((extra) =>
        extra.priceSen === null
          ? []
          : [
              {
                packageHours: extra.packageHours,
                vehicleClassId: extra.vehicleClassId,
                priceSen: extra.priceSen,
              },
            ],
      ),
    };
    const before = hourlyListOf(location);
    const was = summaryOf(before, className);
    const now = summaryOf(next, className);
    if (JSON.stringify(was) === JSON.stringify(now)) return { ok: true };

    // Replaced whole: nothing refers to an area or a package but its zones,
    // which are set again, and receipts keep the area's name.
    await tx.hourlyArea.deleteMany({ where: { locationId } });
    await tx.hourlyExtraRate.deleteMany({ where: { locationId } });
    for (const [index, area] of next.areas.entries()) {
      const created = await tx.hourlyArea.create({
        data: {
          locationId,
          name: area.name,
          sortOrder: index,
          packages: {
            create: area.packages.map((row) => ({
              hours: row.hours,
              includedHours: row.includedHours,
              rates: {
                create: Object.entries(row.prices).map(
                  ([vehicleClassId, priceSen]) => ({
                    vehicleClassId,
                    priceSen,
                  }),
                ),
              },
            })),
          },
        },
        select: { id: true },
      });
      await tx.zone.updateMany({
        where: { id: { in: [...area.zoneIds] }, locationId },
        data: { hourlyAreaId: created.id },
      });
    }
    if (next.extras.length > 0) {
      await tx.hourlyExtraRate.createMany({
        data: next.extras.map((extra) => ({ locationId, ...extra })),
      });
    }

    await logActivity(tx, actor, {
      action: "location.hourly.updated",
      entityId: locationId,
      before: was,
      after: now,
    });
    return { ok: true };
  });
}
