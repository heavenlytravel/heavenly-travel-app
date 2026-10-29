import { cx } from "@repo/ui/cx";

/**
 * A row of counts on the ink band: "2 Offers · 1 Today · 4 Coming up".
 * A count that asks for action (`alert`) lights up in amber when above
 * zero.
 */
export function BandStats({
  items,
}: {
  items: { label: string; value: number; alert?: boolean }[];
}) {
  return (
    <dl className="grid grid-cols-3 gap-2">
      {items.map((item) => {
        const hot = item.alert && item.value > 0;
        return (
          <div
            key={item.label}
            className={cx(
              "grid gap-0.5 rounded-2xl px-3 py-2.5 ring-1 backdrop-blur-sm",
              hot
                ? "bg-amber-300/15 ring-amber-300/40"
                : "bg-white/[0.07] ring-white/10",
            )}
          >
            <dt
              className={cx(
                "order-2 text-xs font-medium",
                hot ? "text-amber-200" : "text-white/60",
              )}
            >
              {item.label}
            </dt>
            <dd
              className={cx(
                "order-1 text-2xl font-bold tabular-nums",
                hot ? "text-amber-100" : "text-white",
              )}
            >
              {item.value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
