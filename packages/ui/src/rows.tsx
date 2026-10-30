import type { ReactNode } from "react";
import { cx } from "./cx.js";

/**
 * Label and value pairs, one per line, the label on the left. A long value
 * without spaces, an email or a reference, breaks rather than run past its
 * card or a phone's screen. The text size is the caller's (`className`).
 */
export function Rows({
  rows,
  className,
}: {
  rows: [label: string, value: ReactNode][];
  className?: string;
}) {
  return (
    <dl className={cx("ui:divide-y ui:divide-hairline", className)}>
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="ui:flex ui:justify-between ui:gap-6 ui:py-2.5"
        >
          <dt className="ui:shrink-0 ui:text-muted">{label}</dt>
          <dd className="ui:min-w-0 ui:text-right ui:font-medium ui:text-body ui:[overflow-wrap:anywhere]">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** What a place shows under its name: its address, unless that only repeats the name. */
export function placeAddress(place: {
  label: string;
  address: string;
}): string | null {
  return place.address !== place.label ? place.address : null;
}

const ADDRESS_SIZES = {
  xs: "ui:text-xs",
  caption: "ui:text-caption",
} as const;

/** A place for a row's value: its name, and its address under it in grey. */
export function PlaceValue({
  place,
  size = "xs",
}: {
  place: { label: string; address: string };
  /** The address line: `xs` in the console's rows, `caption` in the site's. */
  size?: keyof typeof ADDRESS_SIZES;
}) {
  const address = placeAddress(place);
  return (
    <>
      <span className="ui:block">{place.label}</span>
      {address ? (
        <span
          className={cx(
            "ui:block ui:font-normal ui:text-muted",
            ADDRESS_SIZES[size],
          )}
        >
          {address}
        </span>
      ) : null}
    </>
  );
}
