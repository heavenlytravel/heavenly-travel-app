import { cx } from "@repo/ui/cx";
import Link from "next/link";

/**
 * Fleet's two lists as a switch on the band: Vehicles and Drivers, each
 * with its count.
 */
export function FleetTabs({
  current,
  vehicles,
  drivers,
}: {
  current: "vehicles" | "drivers";
  vehicles: number;
  drivers: number;
}) {
  const tabs = [
    { key: "vehicles", href: "/vehicles", label: "Vehicles", count: vehicles },
    { key: "drivers", href: "/drivers", label: "Drivers", count: drivers },
  ] as const;
  return (
    <nav
      aria-label="Fleet"
      className="grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.07] p-1 ring-1 ring-white/10 lg:max-w-sm"
    >
      {tabs.map((tab) => {
        const active = tab.key === current;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors",
              active
                ? "bg-white text-ink shadow-sm"
                : "text-white/70 hover:text-white",
            )}
          >
            {tab.label}
            <span
              className={cx(
                "rounded-full px-1.5 text-xs tabular-nums",
                active ? "bg-mist text-navy" : "bg-white/10",
              )}
            >
              {tab.count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
