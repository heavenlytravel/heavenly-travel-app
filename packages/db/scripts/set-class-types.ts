// Usage: pnpm --filter @repo/db db:set-class-types [-- --dry-run]
//
// Run once per database, after the push that adds class types and tiers
// and before the merge that reads them
// (docs/261111-catalogue-booking-flow-and-ops.md, part A). Each class is
// found by the name ops typed ("Deluxe- Mpv", however it was spaced) and
// given its type and tier from KINDS below, which renames it "Deluxe - MPV"
// and its slug "deluxe-mpv", logged as any rename is. Nothing else about a
// class changes: its id, rates, offerings, vehicles, models and the
// bookings made with it stay as they are. A class with a type already is
// skipped, so a second run changes nothing; one whose name is not in KINDS
// is listed and left for ops to give a type in the console.
//
// It then numbers each category's classes 1, 2, 3 in the order they had,
// so the arrows that replace the sort order field move one place a click.
// With --dry-run it prints what it would do and writes nothing.
import { SYSTEM_ACTOR } from "../src/activity-actions";
import { db } from "../src/client";
import { slugify } from "../src/slug";
import { classNameOf } from "../src/vehicle-class-input";
import { updateVehicleClass } from "../src/vehicle-classes";

/**
 * Each class's type and tier, by the slug of the name it has now. The
 * developer confirms the Van and Coach rows before production's run.
 */
const KINDS: Record<string, { type: string; tier: string }> = {
  "standard-sedan": { type: "Sedan", tier: "Standard" },
  "deluxe-sedan": { type: "Sedan", tier: "Deluxe" },
  "standard-suv": { type: "SUV", tier: "Standard" },
  "standard-mpv": { type: "MPV", tier: "Standard" },
  "deluxe-mpv": { type: "MPV", tier: "Deluxe" },
  "executive-mpv": { type: "MPV", tier: "Executive" },
  "standard-van": { type: "Van", tier: "Standard" },
  "vip-seating-van": { type: "Van", tier: "VIP Seating" },
  "luggage-truck": { type: "Truck", tier: "" },
  "coach-44-seater": { type: "Coach", tier: "44 Seater Standard" },
  // Development's coach, named before production's was.
  coach: { type: "Coach", tier: "44 Seater Standard" },
  "coach-vip": { type: "Coach", tier: "VIP" },
};

const DRY_RUN = process.argv.includes("--dry-run");
const say = (line: string) => console.log(DRY_RUN ? `[dry run] ${line}` : line);

const classes = await db.vehicleClass.findMany({
  orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  select: { id: true, name: true, slug: true, typeId: true, category: true },
});

let given = 0;
const left: string[] = [];
for (const vehicleClass of classes) {
  if (vehicleClass.typeId) continue;
  const kinds = KINDS[slugify(vehicleClass.name)];
  if (!kinds) {
    left.push(`${vehicleClass.name} (${vehicleClass.slug})`);
    continue;
  }
  say(
    `${vehicleClass.name} (${vehicleClass.slug}): ${kinds.type}, ${kinds.tier || "no tier"}, now ${classNameOf(kinds)}.`,
  );
  if (!DRY_RUN) {
    const done = await updateVehicleClass(SYSTEM_ACTOR, vehicleClass.id, kinds);
    if (!done.ok) {
      throw new Error(`${vehicleClass.name}: ${done.error}`);
    }
  }
  given += 1;
}

// The order each category had, numbered again from 1.
const places = new Map<string, number>();
let renumbered = 0;
for (const vehicleClass of await db.vehicleClass.findMany({
  orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  select: { id: true, sortOrder: true, category: true },
})) {
  const place = (places.get(vehicleClass.category) ?? 0) + 1;
  places.set(vehicleClass.category, place);
  if (vehicleClass.sortOrder === place) continue;
  if (!DRY_RUN) {
    await db.vehicleClass.update({
      where: { id: vehicleClass.id },
      data: { sortOrder: place },
    });
  }
  renumbered += 1;
}

say(
  `${given} of ${classes.length} classes given a type and a tier; ${renumbered} numbered again in their order.`,
);
if (left.length > 0) {
  say(
    `Not in the list, so left without a type (give each one in the console): ${left.join(", ")}.`,
  );
}
await db.$disconnect();
