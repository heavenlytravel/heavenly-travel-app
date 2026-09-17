import { useId, type CSSProperties } from "react";
import styles from "../page.module.css";
import type { Vehicle } from "../../../_lib/content";
import { PLANS, RING, SEAT, WHEEL, type PlanSeat } from "../_lib/plans";
import { shortName } from "../_lib/headcount";

const INK = "#141414";
const VERMILION = "#E8442A";
const GREEN = "#1F4F46";
const BONE = "#F7F4EC";
const CANVAS = "#E9E4D8";

/** The whole fill-in never takes longer than this, however many seats. */
const STAGGER_BUDGET_MS = 420;
const STAGGER_STEP_MS = 16;

type Props = {
  vehicle: Vehicle;
  /** Passenger seats taken, filled from the front. */
  occupied: number;
  /** Seats before this index were already taken, so they do not replay. */
  staggerFrom?: number;
  /** Thumbnails stay still and use a lighter line. */
  animate?: boolean;
  /** "onGreen" swaps the body to ink so it reads on the dark band. */
  tone?: "onCanvas" | "onGreen";
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
  /** Hide from assistive tech when the text beside it says the same. */
  decorative?: boolean;
};

export function SeatPlan({
  vehicle,
  occupied,
  staggerFrom = 0,
  animate = false,
  tone = "onCanvas",
  strokeWidth = 2,
  className,
  style,
  decorative = false,
}: Props) {
  const hatchId = useId();
  const plan = PLANS[vehicle.id];
  const taken = Math.min(plan.capacity, Math.max(0, occupied));
  const body = tone === "onGreen" ? INK : GREEN;
  const step = Math.min(
    STAGGER_STEP_MS,
    STAGGER_BUDGET_MS / Math.max(1, taken - staggerFrom),
  );

  const line = {
    stroke: INK,
    strokeWidth,
    vectorEffect: "non-scaling-stroke",
  } as const;
  const cabinY = WHEEL + RING;
  const cabinH = plan.beam - RING * 2;

  const label = `${taken} of ${plan.capacity} seats taken in ${article(shortName(vehicle))}`;

  return (
    <svg
      viewBox={`0 0 ${plan.width} ${plan.height}`}
      className={className}
      style={style}
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": label })}
    >
      <defs>
        <pattern
          id={hatchId}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="3" height="8" fill={BONE} />
        </pattern>
      </defs>

      {/* Wheels, tucked under the body */}
      {plan.wheelsX.map((x) => (
        <g key={x} fill={INK}>
          <rect x={x} y={0} width={40} height={WHEEL + 4} rx={3} />
          <rect
            x={x}
            y={plan.height - WHEEL - 4}
            width={40}
            height={WHEEL + 4}
            rx={3}
          />
        </g>
      ))}

      {/* Body */}
      <rect
        x={1}
        y={WHEEL}
        width={plan.length - 2}
        height={plan.beam}
        rx={plan.radius}
        fill={body}
        {...line}
      />

      {/* Windscreen */}
      <rect
        x={plan.nose - 7}
        y={cabinY + 5}
        width={4}
        height={cabinH - 10}
        rx={2}
        fill={BONE}
      />

      {/* Boot or luggage bay */}
      <rect
        x={plan.length - plan.bay + 5}
        y={cabinY}
        width={plan.bay - 5 - RING - 2}
        height={cabinH}
        rx={4}
        fill={`url(#${hatchId})`}
      />

      {/* Cabin floor */}
      <rect
        x={plan.nose}
        y={cabinY}
        width={plan.length - plan.nose - plan.bay}
        height={cabinH}
        rx={5}
        fill={CANVAS}
        {...line}
      />

      {/* Passenger door on the kerb side */}
      {plan.doorX !== null && (
        <g>
          <rect
            x={plan.doorX}
            y={WHEEL + plan.beam - RING - 2}
            width={SEAT + 4}
            height={RING + 4}
            fill={CANVAS}
          />
          <path
            d={`M${plan.doorX} ${WHEEL + plan.beam - RING - 1}v${RING + 2}M${plan.doorX + SEAT + 4} ${WHEEL + plan.beam - RING - 1}v${RING + 2}`}
            fill="none"
            {...line}
          />
        </g>
      )}

      {plan.seats.map((seat) => (
        <SeatMark
          key={`${seat.x}-${seat.y}`}
          seat={seat}
          taken={seat.index >= 0 && seat.index < taken}
          delay={
            animate && seat.index >= staggerFrom
              ? Math.round((seat.index - staggerFrom) * step)
              : 0
          }
          animate={animate}
          line={line}
        />
      ))}
    </svg>
  );
}

function article(name: string): string {
  return `${/^[aeiou]/i.test(name) ? "an" : "a"} ${name}`;
}

function SeatMark({
  seat,
  taken,
  delay,
  animate,
  line,
}: {
  seat: PlanSeat;
  taken: boolean;
  delay: number;
  animate: boolean;
  line: {
    stroke: string;
    strokeWidth: number;
    vectorEffect: "non-scaling-stroke";
  };
}) {
  const { x, y, kind } = seat;
  const cx = x + SEAT / 2 - 2;
  const cy = y + SEAT / 2;

  if (kind === "crew") {
    return (
      <rect
        x={x}
        y={y}
        width={SEAT}
        height={SEAT}
        rx={7}
        fill="none"
        strokeDasharray="4 3"
        {...line}
      />
    );
  }

  if (kind === "driver") {
    return (
      <g>
        <rect x={x} y={y} width={SEAT} height={SEAT} rx={7} fill={INK} />
        {/* Steering wheel */}
        <circle
          cx={x + 4}
          cy={cy}
          r={7}
          fill="none"
          stroke={INK}
          strokeWidth={3}
        />
        <circle cx={cx} cy={cy} r={5.5} fill={BONE} />
      </g>
    );
  }

  return (
    <g
      className={taken && animate ? styles.seatTaken : undefined}
      style={{ "--delay": `${delay}ms` } as CSSProperties}
    >
      <rect
        x={x}
        y={y}
        width={SEAT}
        height={SEAT}
        rx={7}
        fill={taken ? VERMILION : BONE}
        {...line}
      />
      {/* Backrest, so the seat faces the front */}
      <rect
        x={x + SEAT - 7}
        y={y + 3}
        width={4}
        height={SEAT - 6}
        rx={2}
        fill={INK}
      />
      {taken && (
        <circle className={styles.head} cx={cx} cy={cy} r={6} fill={INK} />
      )}
    </g>
  );
}
