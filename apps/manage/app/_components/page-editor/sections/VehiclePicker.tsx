"use client";

import { SECTION_LIMITS, TRIP_CATEGORY_LABELS, isTripCategory } from "@repo/db";
import { Select } from "@repo/ui/select";
import { RowControls, movedRow } from "../../RowControls";
import type { SectionClass } from "./data";

/**
 * The vehicle classes a section shows, in its order: each named from the
 * catalogue, with up, down and remove, and a list to add another. On a hub
 * it offers the classes of its service; on the home page, every class,
 * under its service. A class taken off sale or out of the catalogue says
 * so: the site leaves it out.
 */
export function VehiclePicker({
  classIds,
  classes,
  category,
  onChange,
}: {
  classIds: readonly string[];
  classes: readonly SectionClass[];
  /** The service whose classes it offers; null for every class. */
  category: string | null;
  onChange: (classIds: string[]) => void;
}) {
  const byId = new Map(classes.map((c) => [c.id, c]));
  const offered = classes.filter(
    (c) =>
      c.isActive &&
      !classIds.includes(c.id) &&
      (category === null || c.category === category),
  );
  const serviceOf = (c: SectionClass) =>
    isTripCategory(c.category) ? TRIP_CATEGORY_LABELS[c.category] : c.category;
  const full = classIds.length >= SECTION_LIMITS.classes;

  return (
    <div className="grid gap-3">
      {classIds.length > 0 ? (
        <ol className="divide-y divide-hairline rounded-control border border-hairline px-4">
          {classIds.map((id, index) => {
            const c = byId.get(id);
            return (
              <li
                key={id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <span className="text-sm">
                  {c ? (
                    <>
                      <span className="font-medium text-ink">{c.name}</span>
                      {category === null ? (
                        <span className="text-muted"> · {serviceOf(c)}</span>
                      ) : null}
                      {c.isActive ? null : (
                        <span className="text-warning">
                          {" "}
                          · Off sale, left out
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-warning">
                      Removed class, left out
                    </span>
                  )}
                </span>
                <RowControls
                  name={c?.name ?? "the removed class"}
                  isFirst={index === 0}
                  isLast={index === classIds.length - 1}
                  onMove={(by) => onChange(movedRow(classIds, index, by))}
                  onRemove={() => onChange(classIds.filter((x) => x !== id))}
                />
              </li>
            );
          })}
        </ol>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Add a class"
          className="w-72"
          value=""
          placeholder={
            full
              ? `At most ${SECTION_LIMITS.classes} classes`
              : offered.length === 0
                ? "Every class is here"
                : "Add a class…"
          }
          disabled={full || offered.length === 0}
          options={
            category === null
              ? [...new Set(offered.map(serviceOf))].map((label) => ({
                  label,
                  options: offered
                    .filter((c) => serviceOf(c) === label)
                    .map((c) => ({ value: c.id, label: c.name })),
                }))
              : offered.map((c) => ({ value: c.id, label: c.name }))
          }
          onValueChange={(id) => {
            if (id) onChange([...classIds, id]);
          }}
        />
        <span className="text-xs text-muted tabular-nums">
          {classIds.length} of {SECTION_LIMITS.classes}
        </span>
      </div>
    </div>
  );
}
