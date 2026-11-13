import { changedFields, logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { refuse, type Change, type Created, type Refusal } from "./change";
import { db } from "./client";
import type { Prisma, VehicleClass } from "./generated/prisma/client";
import { movedRow } from "./list-move";
import { madeOrderBy, type MadeOrder } from "./list-order";
import { byCategory } from "./offering-input";
import {
  checkVehicleClassFields,
  classNameOf,
  classSlugOf,
  type VehicleClassFields,
} from "./vehicle-class-input";
import { deletedMediaRefusal } from "./media";

export type { VehicleClass };

/**
 * The catalogue: the classes of vehicle the site sells, what each is, its
 * seats, its luggage and its picture. The rates and the rules are each
 * location's, on its offerings (./offerings). The reader serves the
 * Vehicle classes screen; the writers are the screen's, each taking the
 * actor and logging inside its transaction. The console never deletes a
 * class, it turns one off; a booking keeps its snapshot. A class's models
 * are ./vehicle-models. See docs/260930-ops-screens.md,
 * docs/261018-location-work-and-class-catalogue.md and
 * docs/261019-vehicles-and-drivers.md.
 */

const NOT_FOUND: Change = refuse(
  "This class was deleted meanwhile. Go back to the catalogue.",
);

const withOfferings = {
  include: {
    models: {
      select: {
        vehicles: { where: { isActive: true }, select: { locationId: true } },
      },
    },
    offerings: {
      select: {
        id: true,
        isActive: true,
        perKmSen: true,
        location: {
          select: { id: true, name: true, slug: true, state: true },
        },
      },
      orderBy: { location: { name: "asc" } },
    },
  },
} satisfies Prisma.VehicleClassDefaultArgs;

type CatalogueRow = Prisma.VehicleClassGetPayload<typeof withOfferings>;

/**
 * A class with the locations that sell it, on sale or off, by name, with
 * its rates at each, and how many of its vehicles are in service
 * at each location, by the location's id.
 */
export type CatalogueClass = Omit<CatalogueRow, "models"> & {
  inServiceAt: Record<string, number>;
};

function catalogueClass({ models, ...row }: CatalogueRow): CatalogueClass {
  const inServiceAt: Record<string, number> = {};
  for (const { locationId } of models.flatMap((model) => model.vehicles)) {
    inServiceAt[locationId] = (inServiceAt[locationId] ?? 0) + 1;
  }
  return { ...row, inServiceAt };
}

/**
 * Every class, active or not, with where it is sold: car with driver
 * first, then by sort order and name, or by when each was added
 * (`order`).
 */
export async function listVehicleClasses(
  order?: MadeOrder,
): Promise<CatalogueClass[]> {
  const rows = await db.vehicleClass.findMany({
    orderBy: order
      ? madeOrderBy(order)
      : [{ sortOrder: "asc" }, { name: "asc" }],
    ...withOfferings,
  });
  const classes = rows.map(catalogueClass);
  return order ? classes : classes.sort(byCategory);
}

/** A class as a form picks it: what it is called, its category and whether it is on. */
export type ClassOption = Pick<
  VehicleClass,
  "id" | "name" | "category" | "isActive"
>;

/** Every class, active or not, in the catalogue's order, as a form lists them. */
export async function listClassOptions(): Promise<ClassOption[]> {
  const rows = await db.vehicleClass.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, category: true, isActive: true },
  });
  return rows.sort(byCategory);
}

const withKinds = {
  include: {
    type: { select: { name: true } },
    tier: { select: { name: true } },
  },
} satisfies Prisma.VehicleClassDefaultArgs;

/** A class with the names of its type and tier, as its form shows them. */
export type ClassWithKinds = Prisma.VehicleClassGetPayload<typeof withKinds>;

export function getVehicleClass(id: string): Promise<ClassWithKinds | null> {
  return db.vehicleClass.findUnique({ where: { id }, ...withKinds });
}

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((each, i) => each === b[i]);

/** The types and the tiers there are, by name: what the class form suggests as they are typed. */
export async function listClassKinds(): Promise<{
  types: string[];
  tiers: string[];
}> {
  const [types, tiers] = await Promise.all([
    db.vehicleType.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    db.vehicleTier.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    types: types.map((type) => type.name),
    tiers: tiers.map((tier) => tier.name),
  };
}

type Tx = Prisma.TransactionClient;

/**
 * The type and tier as they are kept: each typed name spelled as the one
 * there is, however it was typed ("Mpv" reads "MPV" once MPV exists), so
 * a class's name always matches its type's and tier's; a new one as typed.
 */
async function keptKinds(
  tx: Tx,
  kinds: { type: string; tier: string },
): Promise<{ type: string; tier: string }> {
  const [type, tier] = await Promise.all([
    kinds.type
      ? tx.vehicleType.findFirst({
          where: { name: { equals: kinds.type, mode: "insensitive" } },
          select: { name: true },
        })
      : null,
    kinds.tier
      ? tx.vehicleTier.findFirst({
          where: { name: { equals: kinds.tier, mode: "insensitive" } },
          select: { name: true },
        })
      : null,
  ]);
  return { type: type?.name ?? kinds.type, tier: tier?.name ?? kinds.tier };
}

/** The type of this name (as `keptKinds` spells it), added when new; one statement, so two adding it at once both get it. */
function typeFor(tx: Tx, name: string) {
  return tx.vehicleType.upsert({
    where: { name },
    create: { name },
    update: {},
  });
}

/** The tier of this name, as `typeFor`; none for no name. */
async function tierFor(tx: Tx, name: string) {
  if (!name) return null;
  return tx.vehicleTier.upsert({
    where: { name },
    create: { name },
    update: {},
  });
}

/** A type and a tier no class is of any more go, so a typo leaves nothing behind. */
async function dropKindsIfUnused(
  tx: Tx,
  kinds: { typeId: string | null; tierId: string | null },
) {
  if (kinds.typeId) {
    await tx.vehicleType.deleteMany({
      where: { id: kinds.typeId, classes: { none: {} } },
    });
  }
  if (kinds.tierId) {
    await tx.vehicleTier.deleteMany({
      where: { id: kinds.tierId, classes: { none: {} } },
    });
  }
}

/** The refusal of a name another class has: one class per tier and type. */
function takenRefusal(name: string) {
  return refuse(
    `${name} is in the catalogue already. Choose another tier or type, or edit that class.`,
    "tier",
  );
}

/**
 * Adds a class to the catalogue inside the caller's transaction: its type
 * and tier found or added, its name and slug made from them, last in its
 * category. The catalogue's "Add Class" and a location's new class both
 * add one here.
 */
export async function createClassIn(
  tx: Tx,
  actor: Actor,
  fields: VehicleClassFields,
): Promise<{ ok: true; vehicleClass: VehicleClass } | Refusal> {
  const check = checkVehicleClassFields(fields);
  if (!check.ok) return check;
  const kinds = await keptKinds(tx, fields);
  const name = classNameOf(kinds);
  const slug = classSlugOf(kinds);
  const taken = await tx.vehicleClass.findUnique({ where: { slug } });
  if (taken) return takenRefusal(taken.name);
  const gone = await deletedMediaRefusal(
    tx,
    fields.imageUrls,
    "A picture",
    "imageUrls",
  );
  if (gone) return gone;

  // Its own columns; the type and tier are rows of their own.
  const {
    description,
    category,
    minPassengers,
    maxPassengers,
    luggage,
    imageUrls,
    isActive,
  } = fields;
  const type = await typeFor(tx, kinds.type);
  const tier = await tierFor(tx, kinds.tier);
  const last = await tx.vehicleClass.aggregate({
    where: { category: fields.category },
    _max: { sortOrder: true },
  });
  const vehicleClass = await tx.vehicleClass.create({
    data: {
      description,
      category,
      minPassengers,
      maxPassengers,
      luggage,
      imageUrls,
      isActive,
      slug,
      name,
      typeId: type.id,
      tierId: tier?.id ?? null,
      sortOrder: (last._max.sortOrder ?? 0) + 1,
    },
  });
  await logActivity(tx, actor, {
    action: "vehicle-class.created",
    entityId: vehicleClass.id,
    after: { slug, name, ...fields },
  });
  return { ok: true, vehicleClass };
}

/** A new class, its name and slug from its tier and type. */
export async function createVehicleClass(
  actor: Actor,
  fields: VehicleClassFields,
): Promise<Created> {
  return db.$transaction(async (tx) => {
    const made = await createClassIn(tx, actor, fields);
    return made.ok ? { ok: true, id: made.vehicleClass.id } : made;
  });
}

/**
 * Changes any of the editable fields. A new type or tier renames the class
 * and its slug, and the class pages of the locations' sites follow the
 * slug; a booking keeps the name it was made with. Saving what is already
 * there logs nothing.
 */
export async function updateVehicleClass(
  actor: Actor,
  id: string,
  patch: Partial<VehicleClassFields>,
): Promise<Change> {
  const check = checkVehicleClassFields(patch);
  if (!check.ok) return check;

  return db.$transaction(async (tx) => {
    const vehicleClass = await tx.vehicleClass.findUnique({
      where: { id },
      include: { type: true, tier: true },
    });
    if (!vehicleClass) return NOT_FOUND;

    const {
      imageUrls,
      type: typePatch,
      tier: tierPatch,
      ...columnsPatch
    } = patch;
    const kindsBefore = {
      type: vehicleClass.type?.name ?? "",
      tier: vehicleClass.tier?.name ?? "",
    };
    const kindsAfter = await keptKinds(tx, {
      type: typePatch ?? kindsBefore.type,
      tier: tierPatch ?? kindsBefore.tier,
    });
    const kindsChanged =
      kindsAfter.type !== kindsBefore.type ||
      kindsAfter.tier !== kindsBefore.tier;
    // A class from before types keeps its typed name until it is given one.
    const named = kindsAfter.type !== "";
    const name = named ? classNameOf(kindsAfter) : vehicleClass.name;
    const slug = named ? classSlugOf(kindsAfter) : vehicleClass.slug;

    // The pictures are a list, compared as one; the rest field by field.
    const pictures =
      imageUrls !== undefined && !sameList(vehicleClass.imageUrls, imageUrls)
        ? {
            before: { imageUrls: vehicleClass.imageUrls },
            after: { imageUrls },
          }
        : null;
    const fieldsChanged = changedFields(vehicleClass, {
      ...columnsPatch,
      name,
      slug,
    });
    if (!fieldsChanged && !pictures && !kindsChanged) return { ok: true };
    const kinds = kindsChanged
      ? { before: kindsBefore, after: kindsAfter }
      : null;
    const changed = {
      before: {
        ...kinds?.before,
        ...fieldsChanged?.before,
        ...pictures?.before,
      },
      after: { ...kinds?.after, ...fieldsChanged?.after, ...pictures?.after },
    };
    if (pictures) {
      const gone = await deletedMediaRefusal(
        tx,
        pictures.after.imageUrls,
        "A picture",
        "imageUrls",
      );
      if (gone) return gone;
    }

    const data: Prisma.VehicleClassUncheckedUpdateInput = {
      ...fieldsChanged?.after,
      ...pictures?.after,
      // The list saved, the old one picture is spent: db:set-class-pictures
      // never brings back a picture taken out of the list.
      ...(pictures ? { imageUrl: null } : {}),
    };
    if (kindsChanged) {
      if (slug !== vehicleClass.slug) {
        const taken = await tx.vehicleClass.findUnique({ where: { slug } });
        if (taken && taken.id !== id) return takenRefusal(taken.name);
        // A location's page of the class is found by its slug.
        await tx.locationPage.updateMany({
          where: { page: vehicleClass.category, slug: vehicleClass.slug },
          data: { slug },
        });
      }
      data.typeId = (await typeFor(tx, kindsAfter.type)).id;
      data.tierId = (await tierFor(tx, kindsAfter.tier))?.id ?? null;
    }

    await tx.vehicleClass.update({ where: { id }, data });
    if (kindsChanged) await dropKindsIfUnused(tx, vehicleClass);
    await logActivity(tx, actor, {
      action: "vehicle-class.updated",
      entityId: id,
      before: changed.before,
      after: changed.after,
    });
    return { ok: true };
  });
}

/**
 * Moves a class one place earlier or later among its category's, the
 * catalogue's order, which a location's own order starts from. The
 * category's places are written again as 1, 2, 3 from the order on
 * screen, and the order logged against the class moved.
 */
export async function moveVehicleClass(
  actor: Actor,
  id: string,
  by: -1 | 1,
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const vehicleClass = await tx.vehicleClass.findUnique({ where: { id } });
    if (!vehicleClass) return NOT_FOUND;
    const rows = await tx.vehicleClass.findMany({
      where: { category: vehicleClass.category },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, sortOrder: true },
    });
    const after = movedRow(
      rows,
      rows.findIndex((row) => row.id === id),
      by,
    );
    if (!after) return { ok: true };
    for (const [place, row] of after.entries()) {
      if (row.sortOrder === place + 1) continue;
      await tx.vehicleClass.update({
        where: { id: row.id },
        data: { sortOrder: place + 1 },
      });
    }
    await logActivity(tx, actor, {
      action: "vehicle-classes.ordered",
      entityId: id,
      before: { order: rows.map((row) => row.name) },
      after: {
        order: after.map((row) => row.name),
        moved: vehicleClass.name,
      },
    });
    return { ok: true };
  });
}
