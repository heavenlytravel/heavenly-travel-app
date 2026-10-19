import Link from "next/link";
import { plural } from "@repo/db";
import type { CatalogueModel } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { ImageIcon } from "@repo/ui/icons";
import Image from "next/image";
import { vehicleModelHref } from "../../_lib/routes";

/**
 * A class's models on its page, in order, a row each: the cover photo,
 * the name, how many photos and vehicles it has, "Off" when customers do
 * not see it. Each row opens the model's form.
 */
export function ModelList({
  classId,
  models,
}: {
  classId: string;
  models: CatalogueModel[];
}) {
  if (models.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No model yet. The customer sees the class alone.
      </p>
    );
  }
  return (
    <ul className="-mx-2 grid">
      {models.map((model) => {
        const cover = model.photos[0];
        return (
          <li key={model.id}>
            <Link
              href={vehicleModelHref(classId, model.id)}
              className="grid grid-cols-[4rem_1fr_auto] items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-neutral-50"
            >
              <span className="relative flex aspect-[3/2] items-center justify-center overflow-hidden rounded-md bg-neutral-100">
                {cover ? (
                  <Image
                    src={cover.url}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-contain"
                  />
                ) : (
                  <ImageIcon className="text-neutral-300" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-neutral-900">
                  {model.name}
                </span>
                <span className="block text-xs text-neutral-500">
                  {plural(model.photos.length, "photo")} ·{" "}
                  {plural(model._count.vehicles, "vehicle")}
                </span>
              </span>
              {model.isActive ? null : <Badge>Off</Badge>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
