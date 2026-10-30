import { cx } from "@repo/ui/cx";

/**
 * A row of counts on the band, in glass tiles as manage's dashboard has
 * its figures: "2 Offers · 1 Today · 4 Coming up". A count that asks for
 * action (`alert`) is lit amber while above zero.
 */
export function BandStats({
  items,
}: {
  items: { label: string; value: number; alert?: boolean }[];
}) {
  return (
    <dl className="grid grid-cols-3 gap-2">
      {items.map((item) => {
        const lit = item.alert && item.value > 0;
        return (
          <div
            key={item.label}
            className={cx(
              "grid gap-1.5 rounded-xl border px-3 py-2.5",
              lit
                ? "border-warning-edge/60 bg-warning-edge/7"
                : "border-white/15 bg-white/6",
            )}
          >
            <dt
              className={cx(
                "order-2 truncate text-caption font-medium",
                lit ? "text-warning-edge" : "text-white/85",
              )}
            >
              {item.label}
            </dt>
            <dd className="order-1 font-serif text-figure leading-none text-white tabular-nums">
              {item.value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
