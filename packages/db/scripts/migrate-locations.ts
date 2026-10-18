// Usage: pnpm --filter @repo/db db:migrate-locations
//
// Run once per database after the schema push of
// docs/261015-locations-as-operation-areas.md, before the follow-up that
// drops `Location.districtCodes`, `Location.tagline`, `District.isActive`,
// the rate columns of `VehicleClass` and `State.multiplier`. It copies what
// those columns held into the new shape:
//
//   1. Each location with no state yet lies in the states of the districts
//      its `districtCodes` named.
//   2. Each location with no zone yet gets one zone per district its
//      `districtCodes` named, the district's boundary as it is, islands
//      included, so what it served before it serves still.
//   3. Each location's tagline goes onto its landing page, in the draft and
//      the published copy, where neither has one.
//   4. Each location sells every active class, at the class's old rates
//      times the multiplier of the location's first state. A location that
//      already offers a class keeps its offering.
//   5. Each booking item with no location takes the location whose zone its
//      pickup falls in.
//
// Running it again changes nothing.
import { db } from "../src/client";
import { DISTRICT_DATA, districtShape } from "../src/district-index";
import {
  LANDING_PAGE,
  PAGE_LOCALE,
  pageContentOf,
} from "../src/location-page-input";
import { isPlace } from "../src/place";
import { zoneAt } from "../src/zone-match";

const stateNames = new Map(
  DISTRICT_DATA.states.map((state) => [state.code, state.name]),
);

const locations = await db.location.findMany({
  orderBy: { name: "asc" },
  include: {
    states: { select: { code: true } },
    zones: { select: { id: true, name: true, shape: true } },
    offerings: { select: { vehicleClassId: true } },
    pages: { where: { page: LANDING_PAGE, locale: PAGE_LOCALE } },
  },
});

// 1. States.
let statesSet = 0;
for (const location of locations) {
  if (location.states.length > 0) continue;
  const codes = [
    ...new Set(
      location.districtCodes.flatMap((code) => {
        const district = districtShape(code);
        return district ? [district.stateCode] : [];
      }),
    ),
  ];
  if (codes.length === 0) {
    console.warn(
      `${location.name} named no known district, so it lies in no state yet; tick its states on the Details tab.`,
    );
    continue;
  }
  await db.location.update({
    where: { id: location.id },
    data: { states: { connect: codes.map((code) => ({ code })) } },
  });
  statesSet += 1;
}

// 2. Zones.
let zonesCreated = 0;
for (const location of locations) {
  if (location.zones.length > 0) continue;
  for (const [sortOrder, code] of location.districtCodes.entries()) {
    const district = districtShape(code);
    if (!district) continue;
    await db.zone.create({
      data: {
        locationId: location.id,
        name: district.name,
        sortOrder,
        shape: district.polygons,
        drawnFrom: { districtCode: district.code, label: district.name },
      },
    });
    zonesCreated += 1;
  }
}

// 3. Taglines.
let taglinesMoved = 0;
for (const location of locations) {
  if (!location.tagline) continue;
  const row = location.pages[0];
  const draft = pageContentOf(LANDING_PAGE, row?.draft);
  const published =
    row && row.published !== null
      ? pageContentOf(LANDING_PAGE, row.published)
      : null;
  if (draft.tagline !== "" || (published && published.tagline !== "")) {
    continue;
  }
  if (row) {
    await db.locationPage.update({
      where: { id: row.id },
      data: {
        draft: { ...draft, tagline: location.tagline },
        ...(published
          ? { published: { ...published, tagline: location.tagline } }
          : {}),
      },
    });
  } else {
    await db.locationPage.create({
      data: {
        locationId: location.id,
        page: LANDING_PAGE,
        locale: PAGE_LOCALE,
        draft: { ...draft, tagline: location.tagline },
      },
    });
  }
  taglinesMoved += 1;
}

// 4. Offerings.
const classes = await db.vehicleClass.findMany({ where: { isActive: true } });
let offeringsCreated = 0;
for (const location of locations) {
  const first = await db.state.findFirst({
    where: { locations: { some: { id: location.id } } },
    orderBy: { code: "asc" },
  });
  const multiplier = first?.multiplier ?? 1;
  const offered = new Set(location.offerings.map((o) => o.vehicleClassId));
  for (const vehicleClass of classes) {
    if (offered.has(vehicleClass.id)) continue;
    const scaled = (sen: number) => Math.round(sen * multiplier);
    await db.locationVehicleClass.create({
      data: {
        locationId: location.id,
        vehicleClassId: vehicleClass.id,
        isActive: true,
        baseFareSen: scaled(vehicleClass.baseFareSen),
        perKmSen: scaled(vehicleClass.perKmSen),
        hourlyRateSen: scaled(vehicleClass.hourlyRateSen),
        minimumFareSen: scaled(vehicleClass.minimumFareSen),
      },
    });
    offeringsCreated += 1;
  }
}

// 5. Booking items.
const zoned = await db.location.findMany({
  select: {
    id: true,
    zones: { select: { id: true, name: true, shape: true } },
  },
});
const items = await db.bookingItem.findMany({
  where: { locationId: null, tripDetails: { isNot: null } },
  select: { id: true, tripDetails: { select: { pickupPlace: true } } },
});
let itemsLinked = 0;
for (const item of items) {
  const pickup = item.tripDetails?.pickupPlace;
  if (!isPlace(pickup)) continue;
  const owner = zoned.find((location) => zoneAt(location.zones, pickup));
  if (!owner) continue;
  await db.bookingItem.update({
    where: { id: item.id },
    data: { locationId: owner.id },
  });
  itemsLinked += 1;
}

await db.$disconnect();
console.log(
  `${locations.length} locations: ${statesSet} given their states, ${zonesCreated} zones drawn from districts, ${taglinesMoved} taglines moved to the landing page, ${offeringsCreated} offerings created, ${itemsLinked} booking items linked.`,
);
// Keep the state names in the log readable for the developer running this.
void stateNames;
