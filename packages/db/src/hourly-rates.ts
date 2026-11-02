import { logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { refuse, type Change } from "./change";
import { db } from "./client";
import {
  isHourlyPackage,
  durationLabel,
  type HourlyList,
  type HourlyListInput,
  type HourlyPackageRow,
} from "./hourly-input";

/**
 * Locations' hourly price lists in the database: the reader the quote and
 * Hourly Rates share, and the page's writer. See ./hourly-input for the
 * rules and docs/261102-booking-ops.md, "Hourly rate grid".
 */

type Client = Pick<typeof db, "hourlyPackage" | "hourlyExtraRate">;

/**
 * Several locations' hourly lists by location id, in two queries whatever
 * their number. A location with nothing priced has an empty list.
 * Package sizes no longer sold are left out.
 */
export async function listHourlyLists(
  locationIds: readonly string[],
  client: Client = db,
): Promise<Map<string, HourlyList>> {
  const ids = [...locationIds];
  const [packages, extras] = await Promise.all([
    client.hourlyPackage.findMany({
      where: { zone: { locationId: { in: ids } } },
      include: { rates: true, zone: { select: { locationId: true } } },
    }),
    client.hourlyExtraRate.findMany({ where: { locationId: { in: ids } } }),
  ]);
  const lists = new Map<string, { zones: Map<string, HourlyPackageRow[]> }>(
    ids.map((id) => [id, { zones: new Map() }]),
  );
  for (const row of packages) {
    if (!isHourlyPackage(row.hours)) continue;
    const zones = lists.get(row.zone.locationId)?.zones;
    if (!zones) continue;
    const rows = zones.get(row.zoneId) ?? [];
    rows.push({
      hours: row.hours,
      includedHours: row.includedHours,
      prices: Object.fromEntries(
        row.rates.map((rate) => [rate.vehicleClassId, rate.priceSen]),
      ),
    });
    zones.set(row.zoneId, rows);
  }
  return new Map(
    ids.map((id) => [
      id,
      {
        zones: [...lists.get(id)!.zones].map(([zoneId, rows]) => ({
          zoneId,
          packages: rows.sort((a, b) => a.hours - b.hours),
        })),
        extras: extras.flatMap((extra) =>
          extra.locationId === id && isHourlyPackage(extra.packageHours)
            ? [
                {
                  packageHours: extra.packageHours,
                  vehicleClassId: extra.vehicleClassId,
                  priceSen: extra.priceSen,
                },
              ]
            : [],
        ),
      },
    ]),
  );
}

/** A location's hourly list, for Hourly Rates. */
export async function getHourlyList(locationId: string): Promise<HourlyList> {
  return (await listHourlyLists([locationId])).get(locationId)!;
}

/** The list in words a person reads in the history: each zone's packages and prices. */
function summaryOf(
  list: HourlyList,
  zoneName: (id: string) => string,
  className: (id: string) => string,
) {
  return {
    zones: list.zones
      .map((zone) => ({
        zone: zoneName(zone.zoneId),
        packages: zone.packages.map((row) => ({
          duration: durationLabel(row.hours),
          includedHours: row.includedHours,
          prices: Object.fromEntries(
            Object.entries(row.prices)
              .map(([id, sen]) => [className(id), sen] as const)
              .sort(([a], [b]) => a.localeCompare(b)),
          ),
        })),
      }))
      .filter((zone) => zone.packages.length > 0)
      .sort((a, b) => a.zone.localeCompare(b.zone)),
    extras: list.extras
      .map((extra) => ({
        duration: durationLabel(extra.packageHours),
        class: className(extra.vehicleClassId),
        priceSen: extra.priceSen,
      }))
      .sort(
        (a, b) =>
          a.duration.localeCompare(b.duration) ||
          a.class.localeCompare(b.class),
      ),
  };
}

/**
 * Saves a location's whole hourly list as the page posts it, in place of
 * the one stored: each zone's packages that have a price in at least one
 * class, and the extra hour rates. The zones must be the location's and
 * the classes ones it offers. A booking keeps its own receipt, so nothing
 * booked changes. Saving what is already there logs nothing.
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
        zones: { select: { id: true, name: true } },
        offerings: {
          select: {
            vehicleClassId: true,
            vehicleClass: { select: { name: true } },
          },
        },
      },
    });
    if (!location) {
      return refuse(
        "This location was deleted meanwhile. Go back to Locations.",
      );
    }
    const zoneNames = new Map(location.zones.map((z) => [z.id, z.name]));
    const classNames = new Map(
      location.offerings.map((o) => [o.vehicleClassId, o.vehicleClass.name]),
    );
    const zoneName = (id: string) => zoneNames.get(id) ?? "a zone";
    const className = (id: string) => classNames.get(id) ?? "a class";
    if (!input.zones.every((zone) => zoneNames.has(zone.zoneId))) {
      return refuse("A zone on the list was deleted meanwhile. Reload.");
    }
    const classesKnown = [
      ...input.zones.flatMap((zone) =>
        zone.packages.flatMap((row) =>
          row.prices.map((cell) => cell.vehicleClassId),
        ),
      ),
      ...input.extras.map((extra) => extra.vehicleClassId),
    ].every((id) => classNames.has(id));
    if (!classesKnown) {
      return refuse("A class on the list is no longer offered here. Reload.");
    }

    // What is stored, a package kept only when a class has a price.
    const next: HourlyList = {
      zones: input.zones.map((zone) => ({
        zoneId: zone.zoneId,
        packages: zone.packages
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
          .filter((row) => Object.keys(row.prices).length > 0),
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
    const before = (await listHourlyLists([locationId], tx)).get(locationId)!;
    const was = summaryOf(before, zoneName, className);
    const now = summaryOf(next, zoneName, className);
    if (JSON.stringify(was) === JSON.stringify(now)) return { ok: true };

    // Replaced whole: nothing refers to a package but its prices, and
    // receipts keep the zone's name.
    await tx.hourlyPackage.deleteMany({ where: { zone: { locationId } } });
    await tx.hourlyExtraRate.deleteMany({ where: { locationId } });
    for (const zone of next.zones) {
      for (const row of zone.packages) {
        await tx.hourlyPackage.create({
          data: {
            zoneId: zone.zoneId,
            hours: row.hours,
            includedHours: row.includedHours,
            rates: {
              create: Object.entries(row.prices).map(
                ([vehicleClassId, priceSen]) => ({ vehicleClassId, priceSen }),
              ),
            },
          },
        });
      }
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
