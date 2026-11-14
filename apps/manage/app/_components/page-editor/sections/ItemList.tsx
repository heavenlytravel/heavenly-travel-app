"use client";

import { Button } from "@repo/ui/button";
import type { ReactNode } from "react";
import { RowControls, movedRow } from "../../RowControls";
import type { Rowed } from "./form";

/**
 * The things of a section, one under another, each numbered with its
 * fields and its controls: up, down and remove. "Add …" under them adds an
 * empty one until the section's limit; `actions` stand beside it, such as
 * "Copy From…".
 */
export function ItemList<T extends object>({
  items,
  name,
  limit,
  addLabel,
  newItem,
  onChange,
  actions,
  children,
}: {
  items: readonly Rowed<T>[];
  /** What one is called, as its number reads: "Point". */
  name: string;
  limit: number;
  /** "Add Point". */
  addLabel: string;
  newItem: () => Rowed<T>;
  onChange: (items: Rowed<T>[]) => void;
  actions?: ReactNode;
  /** One item's fields; `update` changes it. */
  children: (item: Rowed<T>, update: (patch: Partial<T>) => void) => ReactNode;
}) {
  const update = (rowId: string, patch: Partial<T>) =>
    onChange(
      items.map((item) =>
        item.rowId === rowId ? { ...item, ...patch } : item,
      ),
    );
  return (
    <div className="grid gap-3">
      {items.length > 0 ? (
        <ol className="divide-y divide-hairline rounded-control border border-hairline px-4">
          {items.map((item, index) => (
            <li key={item.rowId} className="grid gap-3 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">
                  {name} {index + 1}
                </span>
                <RowControls
                  name={`${name} ${index + 1}`}
                  isFirst={index === 0}
                  isLast={index === items.length - 1}
                  onMove={(by) => onChange(movedRow(items, index, by))}
                  onRemove={() =>
                    onChange(
                      items.filter((other) => other.rowId !== item.rowId),
                    )
                  }
                />
              </div>
              {children(item, (patch) => update(item.rowId, patch))}
            </li>
          ))}
        </ol>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={items.length >= limit}
          onClick={() => onChange([...items, newItem()])}
        >
          {addLabel}
        </Button>
        {actions}
        <span className="text-xs text-muted tabular-nums">
          {items.length} of {limit}
        </span>
      </div>
    </div>
  );
}
