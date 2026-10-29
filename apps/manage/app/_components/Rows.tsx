import type { Place } from "@repo/db";
import type { ReactNode } from "react";

/** Label and value pairs, one per line, inside a card. */
export function Rows({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <dl className="divide-y divide-hairline text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-6 py-2.5">
          <dt className="shrink-0 text-muted">{label}</dt>
          <dd className="text-right font-medium text-body">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A place with its address underneath, for the trip rows. */
export function PlaceValue({ place }: { place: Place }) {
  return (
    <>
      <span className="block">{place.label}</span>
      {place.address !== place.label ? (
        <span className="block text-xs font-normal text-muted">
          {place.address}
        </span>
      ) : null}
    </>
  );
}
