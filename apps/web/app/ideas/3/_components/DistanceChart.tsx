"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import styles from "../page.module.css";
import { PLACES, type VehicleId } from "../../../_lib/routes";
import {
  PLACE_MARKS,
  cellFigure,
  cellReading,
  type Journey,
  type Mode,
} from "../_lib/chart";

/** A cell sits at row r, column c of the lower triangle, so c < r always. */
type Cell = { r: number; c: number };

const LAST = PLACES.length - 1;
const keyOf = ({ r, c }: Cell) => `${r}-${c}`;
const same = (a: Cell | null, b: Cell) =>
  a !== null && a.r === b.r && a.c === b.c;

/**
 * True when `cell` lies on the lines drawn from `target` back to its two
 * place names: along the row to the right, or up the column.
 */
function armOf(cell: Cell, target: Cell): "row" | "col" | null {
  if (cell.r === target.r && cell.c > target.c) return "row";
  if (cell.c === target.c && cell.r < target.r) return "col";
  return null;
}

function nextCell({ r, c }: Cell, key: string): Cell | null {
  switch (key) {
    case "ArrowLeft":
      return c > 0 ? { r, c: c - 1 } : null;
    case "ArrowRight":
      return c + 1 < r ? { r, c: c + 1 } : null;
    case "ArrowUp":
      return r - 1 > c ? { r: r - 1, c } : null;
    case "ArrowDown":
      return r < LAST ? { r: r + 1, c } : null;
    case "Home":
      return { r, c: 0 };
    case "End":
      return { r, c: r - 1 };
    default:
      return null;
  }
}

export function DistanceChart({
  mode,
  vehicle,
  journey,
  onSelect,
}: {
  mode: Mode;
  vehicle: VehicleId;
  journey: Journey;
  onSelect: (journey: Journey) => void;
}) {
  const [hovered, setHovered] = useState<Cell | null>(null);
  const [focused, setFocused] = useState<Cell | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  const a = PLACES.findIndex((p) => p.id === journey.from);
  const b = PLACES.findIndex((p) => p.id === journey.to);
  const selected: Cell = { r: Math.max(a, b), c: Math.min(a, b) };
  const hot = hovered ?? focused;
  /** Roving tabindex: the focused cell, otherwise the selected one. */
  const tabStop = focused ?? selected;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, cell: Cell) => {
    const target = nextCell(cell, event.key);
    if (!target) return;
    event.preventDefault();
    buttons.current.get(keyOf(target))?.focus();
  };

  return (
    <div
      role="grid"
      aria-label="Chart of journeys between ten places in Malaysia"
      aria-describedby="chart-help"
      className={styles.chart}
      onMouseLeave={() => setHovered(null)}
    >
      <p className={styles.titleBlock} aria-hidden="true">
        <span className="block text-[11px] font-semibold tracking-[0.16em] uppercase">
          Time, distance and fare chart
        </span>
        <span
          className={`${styles.italic} mt-1 block text-[13px] leading-snug text-(--ink-soft)`}
        >
          Read across from one place and down from the other.
        </span>
      </p>

      {PLACES.map((place, r) => {
        const onCross = hot !== null && (hot.r === r || hot.c === r);
        const onRoute = selected.r === r || selected.c === r;
        return (
          <div role="row" key={place.id} className={styles.row}>
            {PLACES.slice(0, r).map((other, c) => {
              const cell: Cell = { r, c };
              const isSelected = same(selected, cell);
              const isHot = same(hot, cell);
              return (
                <div
                  role="gridcell"
                  key={other.id}
                  aria-selected={isSelected}
                  className={styles.cell}
                  data-selected={isSelected || undefined}
                  data-hot={isHot || undefined}
                  data-cross={
                    (hot !== null && armOf(cell, hot) !== null) || undefined
                  }
                  data-route={armOf(cell, selected) ?? undefined}
                  onMouseEnter={() => setHovered(cell)}
                >
                  <button
                    type="button"
                    ref={(node) => {
                      const key = keyOf(cell);
                      if (node) buttons.current.set(key, node);
                      else buttons.current.delete(key);
                    }}
                    className={styles.cellButton}
                    tabIndex={same(tabStop, cell) ? 0 : -1}
                    aria-label={`${other.name} to ${place.name}, ${cellReading(mode, vehicle, other.id, place.id)}`}
                    onClick={() => onSelect({ from: other.id, to: place.id })}
                    onFocus={() => setFocused(cell)}
                    onBlur={() => setFocused(null)}
                    onKeyDown={(event) => onKeyDown(event, cell)}
                  >
                    {cellFigure(mode, vehicle, other.id, place.id)}
                  </button>
                </div>
              );
            })}
            <div
              role="rowheader"
              aria-label={place.name}
              className={styles.name}
              style={{ gridColumn: `${r + 1} / -1` }}
              data-cross={onCross || undefined}
              data-selected={onRoute || undefined}
            >
              <span className={styles.marker} aria-hidden="true" />
              <span className={styles.nameFull}>{place.name}</span>
              <span className={styles.nameCode}>{place.code}</span>
              {PLACE_MARKS.has(place.id) && (
                <span className="font-normal tracking-normal">
                  {PLACE_MARKS.get(place.id)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
