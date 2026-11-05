import { changedFields, logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { refuse, type Change, type Created } from "./change";
import { db } from "./client";
import type { Prisma, VehicleClass } from "./generated/prisma/client";
import { slugify } from "./slug";
import { byCategory } from "./offering-input";
import {
  checkVehicleClassFields,
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

/** Every class, active or not, with where it is sold: car with driver first, then by sort order and name. */
export async function listVehicleClasses(): Promise<CatalogueClass[]> {
  const rows = await db.vehicleClass.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    ...withOfferings,
  });
  return rows
    .map(catalogueClass)
    .sort(byCategory);
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

export function getVehicleClass(id: string): Promise<VehicleClass | null> {
  return db.vehicleClass.findUnique({ where: { id } });
}

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((each, i) => each === b[i]);

/** A new class, its slug from its name. */
export async function createVehicleClass(
  actor: Actor,
  fields: VehicleClassFields,
): Promise<Created> {
  const check = checkVehicleClassFields(fields);
  if (!check.ok) return check;
  const slug = slugify(fields.name);
  if (!slug) return refuse("Enter a name with a letter or digit.", "name");

  return db.$transaction(async (tx) => {
    const taken = await tx.vehicleClass.findUnique({ where: { slug } });
    if (taken) {
      return refuse(
        `${taken.name} is in the catalogue already. Name this class differently.`,
        "name",
      );
    }
    const gone = await deletedMediaRefusal(
      tx,
      fields.imageUrls,
      "A picture",
      "imageUrls",
    );
    if (gone) return gone;
    const vehicleClass = await tx.vehicleClass.create({
      data: { slug, ...fields },
    });
    await logActivity(tx, actor, {
      action: "vehicle-class.created",
      entityId: vehicleClass.id,
      after: { slug, ...fields },
    });
    return { ok: true, id: vehicleClass.id };
  });
}

/**
 * Changes any of the editable fields. The slug and the category's snapshot
 * on old bookings stay as they are. Saving what is already there logs
 * nothing.
 */
export async function updateVehicleClass(
  actor: Actor,
  id: string,
  patch: Partial<VehicleClassFields>,
): Promise<Change> {
  const check = checkVehicleClassFields(patch);
  if (!check.ok) return check;

  return db.$transaction(async (tx) => {
    const vehicleClass = await tx.vehicleClass.findUnique({ where: { id } });
    if (!vehicleClass) return NOT_FOUND;

    // The pictures are a list, compared as one; the rest field by field.
    const { imageUrls, ...fieldsPatch } = patch;
    const pictures =
      imageUrls !== undefined && !sameList(vehicleClass.imageUrls, imageUrls)
        ? { before: { imageUrls: vehicleClass.imageUrls }, after: { imageUrls } }
        : null;
    const fieldsChanged = changedFields(vehicleClass, fieldsPatch);
    if (!fieldsChanged && !pictures) return { ok: true };
    const changed = {
      before: { ...fieldsChanged?.before, ...pictures?.before },
      after: { ...fieldsChanged?.after, ...pictures?.after },
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

    await tx.vehicleClass.update({ where: { id }, data: changed.after });
    await logActivity(tx, actor, {
      action: "vehicle-class.updated",
      entityId: id,
      before: changed.before,
      after: changed.after,
    });
    return { ok: true };
  });
}
