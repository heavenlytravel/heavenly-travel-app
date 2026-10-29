import { cx } from "@repo/ui/cx";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { Tone } from "../_lib/trip-state";
import { clockOf } from "../_lib/when";

/**
 * Connect's own small parts: the white panel every screen is built of,
 * section labels, the status pill, a Malaysian number plate, initials,
 * the large clock, the route line and the empty state. Phone first: large
 * type for what a driver reads at a glance, everything else quiet.
 */

/** The white panel: rounded, lifted off the mist. */
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
    <Tag
      className={cx(
        "connect-panel rounded-3xl bg-white shadow-[0_1px_2px_rgba(0,38,75,0.06),0_12px_32px_-16px_rgba(0,38,75,0.18)] ring-1 ring-slate-900/5",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** A group's label over its panels: small capitals, a count, and an action at the right. */
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
    <div className="flex items-center justify-between gap-3 px-1">
      <h2 className="flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-slate-500 uppercase">
        {children}
        {count !== undefined ? (
          <span className="rounded-full bg-slate-200/80 px-1.5 py-px text-[0.7rem] tracking-normal text-slate-600 tabular-nums">
            {count}
          </span>
        ) : null}
      </h2>
      {action}
    </div>
  );
}

const PILL_TONES: Record<Tone, string> = {
  amber: "bg-amber-100 text-amber-900",
  brand: "bg-brand-tint text-brand",
  azure: "bg-sky-100 text-sky-900",
  green: "bg-emerald-100 text-emerald-800",
  red: "bg-red-100 text-red-800",
  slate: "bg-slate-100 text-slate-700",
};

const DOT_TONES: Record<Tone, string> = {
  amber: "bg-amber-500",
  brand: "bg-brand",
  azure: "bg-azure",
  green: "bg-emerald-500",
  red: "bg-red-500",
  slate: "bg-slate-400",
};

/** A state, in its colour; a live one pulses. */
export function Pill({
  tone,
  live = false,
  children,
  className,
}: {
  tone: Tone;
  live?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        PILL_TONES[tone],
        className,
      )}
    >
      <Dot tone={tone} live={live} />
      {children}
    </span>
  );
}

/** A small round dot in a state's colour. */
export function Dot({ tone, live = false }: { tone: Tone; live?: boolean }) {
  return (
    <span className="relative flex size-2">
      {live ? (
        <span
          className={cx(
            "connect-ping absolute inline-flex size-full rounded-full opacity-60",
            DOT_TONES[tone],
          )}
        />
      ) : null}
      <span
        className={cx(
          "relative inline-flex size-2 rounded-full",
          DOT_TONES[tone],
        )}
      />
    </span>
  );
}

/** A soft label beside a trip: its class, its passengers, its reference. */
export function Chip({
  icon: Icon,
  children,
  className,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full bg-mist px-2.5 py-1 text-xs font-semibold text-navy",
        className,
      )}
    >
      {Icon ? <Icon aria-hidden className="size-3.5" /> : null}
      {children}
    </span>
  );
}

/** A vehicle's number as its plate reads on the road: white on black. */
export function Plate({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-950 px-2 py-0.5 text-xs font-bold tracking-[0.08em] text-white uppercase tabular-nums ring-1 ring-slate-950/10 ring-offset-1">
      {children}
    </span>
  );
}

const AVATAR_TONES = [
  "bg-brand text-white",
  "bg-navy text-white",
  "bg-azure text-white",
  "bg-sky-100 text-navy",
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
        size === "sm" && "size-7 text-[0.65rem]",
        size === "md" && "size-10 text-sm",
        size === "lg" && "size-14 text-lg",
        tone,
      )}
    >
      {initials}
    </span>
  );
}

/** A time to read from arm's length: "9:30" large, "AM" small beside it. */
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
    <span
      className={cx(
        "font-extrabold tracking-tight tabular-nums leading-none",
        className,
      )}
    >
      {clock}
      <span
        className={cx(
          "ml-1 align-baseline text-[0.38em] font-bold tracking-normal",
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
  /** On the ink band. */
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
                  dark ? "border-white/30" : "border-slate-300",
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
                  dark ? "text-white" : "text-slate-900",
                )}
              >
                {stop.title}
              </span>
              {stop.detail ? (
                <span
                  className={cx(
                    "text-sm",
                    dark ? "text-azure-light" : "text-slate-500",
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
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Panel className="grid justify-items-center gap-3 px-6 py-10 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-brand-tint text-brand ring-8 ring-brand-tint/50">
        <Icon aria-hidden className="size-7" />
      </span>
      <h3 className="mt-2 text-lg font-bold text-ink">{title}</h3>
      {children ? (
        <p className="max-w-xs text-sm text-pretty text-slate-500">
          {children}
        </p>
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
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mist text-navy">
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <span className="text-sm font-medium break-words text-slate-900">
          {children}
        </span>
      </span>
    </div>
  );
}
