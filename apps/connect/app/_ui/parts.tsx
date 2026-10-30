import { SURFACE } from "@repo/console/Card";
import { SectionHeader } from "@repo/console/SectionHeader";
import { Badge } from "@repo/ui/badge";
import { cx } from "@repo/ui/cx";
import type { ComponentType, ReactNode, SVGProps } from "react";
import type { Tone } from "../_lib/trip-state";
import { clockOf } from "../_lib/when";

/**
 * Connect's own small parts, on the console's surfaces and chips: the
 * card every screen is built of, a group's heading, the status chip, a
 * Malaysian number plate, initials, the large clock, the route line and
 * the empty state. Phone first: large type for what a driver reads at a
 * glance, everything else quiet.
 */

/** An icon a part draws: one of `@repo/ui/icons` or of lucide. */
export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * The console's card, on the canvas. `connect-panel` marks it, so a
 * screen's first card rises over the band's edge.
 */
export function Panel({
  className,
  children,
  as: Tag = "section",
}: {
  className?: string;
  children: ReactNode;
  as?: "section" | "div" | "li" | "article";
}) {
  return (
    <Tag className={cx("connect-panel min-w-0", SURFACE, className)}>
      {children}
    </Tag>
  );
}

/** A group's heading over its cards, the console's: its name, a count, and an action at the right. */
export function SectionTitle({
  children,
  count,
  action,
}: {
  children: ReactNode;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <SectionHeader
      title={children}
      badge={
        count !== undefined ? (
          <Badge className="tabular-nums">{count}</Badge>
        ) : undefined
      }
      action={action}
    />
  );
}

/**
 * A state, as the console's chip in its tone, with a disc before the
 * word; a live one pulses. On the band, `onBand` sets it on white, so
 * every tone reads there as it does on a card.
 */
export function Pill({
  tone,
  live = false,
  onBand = false,
  children,
}: {
  tone: Tone;
  live?: boolean;
  onBand?: boolean;
  children: ReactNode;
}) {
  return (
    <Badge tone={tone} className={onBand ? "bg-white" : undefined}>
      <span aria-hidden className="relative flex size-1.5">
        {live ? (
          <span className="connect-ping absolute inline-flex size-full rounded-full bg-current opacity-60" />
        ) : null}
        <span className="relative inline-flex size-1.5 rounded-full bg-current" />
      </span>
      {children}
    </Badge>
  );
}

/** A soft label beside a trip: its class, its passengers. */
export function Chip({
  icon: Icon,
  children,
}: {
  icon?: IconComponent;
  children: ReactNode;
}) {
  return (
    <Badge tone="navy">
      {Icon ? <Icon aria-hidden className="size-3.5" /> : null}
      {children}
    </Badge>
  );
}

/** A vehicle's number as its plate reads on the road: white on the darkest ink. */
export function Plate({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-ink px-2 py-0.5 text-xs font-bold tracking-kicker text-white uppercase tabular-nums ring-1 ring-ink/10 ring-offset-1">
      {children}
    </span>
  );
}

const AVATAR_TONES = [
  "bg-brand text-white",
  "bg-navy text-white",
  "bg-azure-light text-ink",
  "bg-brand-tint text-navy",
  "bg-ink text-azure-light",
];

/** A person's initials in a round tile, its colour fixed by the name. */
export function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const initials =
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?";
  const tone =
    AVATAR_TONES[
      [...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) %
        AVATAR_TONES.length
    ];
  return (
    <span
      aria-hidden
      className={cx(
        "inline-grid shrink-0 place-items-center rounded-full font-bold",
        size === "sm" && "size-7 text-2xs",
        size === "md" && "size-10 text-sm",
        size === "lg" && "size-14 text-lg",
        tone,
      )}
    >
      {initials}
    </span>
  );
}

/**
 * A time to read from arm's length, as the console's figures are set:
 * "9:30" large in the serif, "AM" small beside it.
 */
export function BigTime({
  at,
  className,
  periodClassName,
}: {
  at: Date;
  className?: string;
  periodClassName?: string;
}) {
  const { clock, period } = clockOf(at);
  return (
    <span className={cx("font-serif leading-none tabular-nums", className)}>
      {clock}
      <span
        className={cx(
          "ml-1 align-baseline font-sans text-[0.38em] font-bold",
          periodClassName,
        )}
      >
        {period}
      </span>
    </span>
  );
}

export type Stop = {
  /** "KLIA Terminal 1", or the area before the job is accepted. */
  title: string;
  /** The address, or what the stop is. */
  detail?: string;
  /** Buttons under the stop: navigate there. */
  action?: ReactNode;
};

/** Where from and where to, as a line between two dots. */
export function RouteLine({
  stops,
  dark = false,
  size = "md",
}: {
  stops: Stop[];
  /** On the band. */
  dark?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <ol className={cx("relative grid", size === "md" ? "gap-4" : "gap-2")}>
      {stops.map((stop, index) => {
        const last = index === stops.length - 1 && stops.length > 1;
        return (
          <li key={index} className="relative flex items-start gap-3">
            {index < stops.length - 1 ? (
              // The dotted line from this stop's dot down to the next one's.
              <span
                aria-hidden
                className={cx(
                  "absolute top-[1.1rem] left-[5px] border-l-2 border-dotted",
                  size === "md" ? "-bottom-[1.3rem]" : "-bottom-[0.8rem]",
                  dark ? "border-white/30" : "border-edge",
                )}
              />
            ) : null}
            <span
              aria-hidden
              className={cx(
                "relative mt-[0.3rem] size-3 shrink-0 rounded-full border-2",
                dark ? "border-azure-light" : "border-brand",
                last
                  ? dark
                    ? "bg-azure-light"
                    : "bg-brand"
                  : dark
                    ? "bg-ink"
                    : "bg-white",
              )}
            />
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span
                className={cx(
                  "font-semibold",
                  size === "md" ? "text-base" : "text-sm",
                  dark ? "text-white" : "text-ink",
                )}
              >
                {stop.title}
              </span>
              {stop.detail ? (
                <span
                  className={cx(
                    "text-sm",
                    dark ? "text-azure-light" : "text-muted",
                  )}
                >
                  {stop.detail}
                </span>
              ) : null}
              {stop.action ? <span className="mt-2">{stop.action}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Nothing here yet: an icon in a soft circle, a title, a line, and what to do. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: IconComponent;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Panel className="grid justify-items-center gap-3 px-6 py-10 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-brand-tint text-brand ring-8 ring-brand-tint/50">
        <Icon aria-hidden className="size-7" />
      </span>
      <h3 className="mt-2 text-lg font-bold tracking-title text-ink">
        {title}
      </h3>
      {children ? (
        <p className="max-w-xs text-sm text-pretty text-muted">{children}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </Panel>
  );
}

/** A label and its value, in a list of facts. */
export function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: IconComponent;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-control bg-mist text-navy">
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="text-xs font-semibold text-muted">{label}</span>
        <span className="text-sm font-medium break-words text-body">
          {children}
        </span>
      </span>
    </div>
  );
}
