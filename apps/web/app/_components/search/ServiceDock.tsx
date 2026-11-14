"use client";

import { useState, type CSSProperties } from "react";
import { cx } from "@repo/ui/cx";
import { ChevronUpIcon, Grid3x3Icon } from "@repo/ui/icons";
import { PRODUCTS, type ProductKey } from "../../_lib/search";
import { ProductIcon } from "../Brand";
import look from "./search-card.module.css";

/** The six services, in the dock's order. */
const SERVICES: ProductKey[] = [
  "car-with-driver",
  "coach-charter",
  "attraction",
  "hotel",
  "rental",
  "package",
];

/** The services a narrow dock shows before "More". */
const FIRST = 3;

/** A place in the dock: a service, or the tile that opens the rest. */
const tile =
  "relative flex h-[68px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center text-xs leading-tight font-semibold transition-colors duration-300 focus-ring focus-ring-dark @3xl:h-[60px] @3xl:text-caption @3xl:whitespace-nowrap";

/**
 * The services in one dock of the card's glass, an icon over each name,
 * with a white tile that slides under the chosen one as it changes. The
 * services not booked online yet are shown, marked "Soon", and cannot be
 * chosen.
 *
 * Wide, it is one row of six. Narrow, it keeps to the card's width and
 * shows the first three services and "More", which opens the other three
 * under them. Only the first services can be chosen, so the chosen one is
 * always in view, and the tile is placed by its column (`--col`).
 */
export function ServiceDock({
  chosen,
  onChoose,
}: {
  chosen: ProductKey;
  onChoose: (key: ProductKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const at = SERVICES.indexOf(chosen);

  const service = (key: ProductKey, i: number) => {
    const { label, bookable } = PRODUCTS[key];
    const soonId = `dock-soon-${key}`;
    return (
      <button
        key={key}
        type="button"
        aria-pressed={i === at}
        disabled={!bookable}
        aria-describedby={bookable ? undefined : soonId}
        onClick={() => onChoose(key)}
        className={cx(
          tile,
          "enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/55 aria-pressed:text-ink aria-pressed:hover:bg-transparent",
          i >= FIRST && !open && "@max-3xl:hidden",
        )}
      >
        <ProductIcon service={key} className="size-5 shrink-0" />
        {label}
        {bookable ? null : (
          // Out of the flow, so it never widens the tile; read after its
          // name, as its description.
          <span
            id={soonId}
            className="absolute top-1.5 right-2 text-caps leading-none font-bold text-azure-light"
          >
            Soon
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      role="group"
      aria-label="Choose a travel service"
      style={{ "--col": at } as CSSProperties}
      className={cx(
        look.chip,
        "relative grid w-full grid-cols-4 rounded-[22px] p-1.5 text-white [--cols:4] @3xl:w-auto @3xl:grid-cols-[repeat(6,124px)] @3xl:[--cols:6]",
      )}
    >
      {/* The chosen tile: one place wide, moved by whole places. */}
      <span
        aria-hidden
        className="absolute top-1.5 left-1.5 h-[68px] w-[calc((100%-0.75rem)/var(--cols))] translate-x-[calc(var(--col)*100%)] rounded-2xl bg-white shadow-raised transition-[translate] duration-300 ease-out motion-reduce:transition-none @3xl:h-[60px]"
      />
      {SERVICES.slice(0, FIRST).map(service)}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cx(tile, "hover:bg-white/10 @3xl:hidden")}
      >
        {open ? (
          <ChevronUpIcon className="size-5 shrink-0" />
        ) : (
          <Grid3x3Icon className="size-5 shrink-0" />
        )}
        {open ? "Less" : "More"}
      </button>
      {SERVICES.slice(FIRST).map((key, i) => service(key, i + FIRST))}
    </div>
  );
}
