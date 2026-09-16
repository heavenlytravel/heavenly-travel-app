import styles from "../landing.module.css";

/*
 * Stylised map of Malaysia, combining the two earlier Fable maps:
 *  - fable/1's whole-country network (Peninsula and Borneo) on one projection,
 *      x = (lon - 99) * 30,  y = (8 - lat) * 50
 *  - fable/2's two-layer road stroke: an asphalt under-line with a gold
 *    marking drawn on top.
 * Links draw outward from Langkawi by hop distance, then pins appear.
 */

type Stop = {
  name: string;
  x: number;
  y: number;
  major?: boolean;
  label?: "l" | "r" | "b" | "t";
};

const STOPS: Stop[] = [
  { name: "Langkawi", x: 24, y: 82, major: true, label: "t" },
  { name: "Alor Setar", x: 41, y: 94, label: "r" },
  { name: "Penang", x: 40, y: 130, major: true, label: "r" },
  { name: "Ipoh", x: 63, y: 170, label: "l" },
  { name: "Cameron Highlands", x: 71, y: 177, label: "r" },
  { name: "Kota Bharu", x: 97, y: 94, label: "r" },
  { name: "Kuala Terengganu", x: 124, y: 134, label: "r" },
  { name: "Kuala Lumpur", x: 81, y: 243, major: true, label: "r" },
  { name: "Kuantan", x: 130, y: 210, label: "r" },
  { name: "Melaka", x: 98, y: 290, label: "l" },
  { name: "Johor Bahru", x: 143, y: 326, major: true, label: "r" },
  { name: "Kuching", x: 340, y: 322, major: true, label: "b" },
  { name: "Miri", x: 449, y: 180, label: "r" },
  { name: "Kota Kinabalu", x: 512, y: 101, major: true, label: "t" },
  { name: "Sandakan", x: 574, y: 108, label: "b" },
];

// City pairs we drive between regularly, roughly following the trunk roads.
const LINKS: [string, string][] = [
  ["Langkawi", "Alor Setar"],
  ["Alor Setar", "Penang"],
  ["Penang", "Ipoh"],
  ["Ipoh", "Cameron Highlands"],
  ["Ipoh", "Kuala Lumpur"],
  ["Kuala Lumpur", "Melaka"],
  ["Melaka", "Johor Bahru"],
  ["Kuala Lumpur", "Kuantan"],
  ["Kuantan", "Kuala Terengganu"],
  ["Kuala Terengganu", "Kota Bharu"],
  ["Kuantan", "Johor Bahru"],
  ["Ipoh", "Kota Bharu"],
  ["Kuching", "Miri"],
  ["Miri", "Kota Kinabalu"],
  ["Kota Kinabalu", "Sandakan"],
];

// Rough silhouettes on the same projection, drawn faintly so the roads do the talking.
const PENINSULA =
  "M36 65 L40 100 L42 130 L48 160 L53 190 L69 240 L72 260 L90 285 L120 325 L135 335 L150 330 L158 315 L147 285 L135 250 L132 210 L134 175 L126 140 L108 105 L99 93 L93 85 L75 75 L60 70 L48 65 Z";
const BORNEO =
  "M318 305 L339 315 L375 290 L384 285 L420 240 L450 180 L468 170 L486 135 L512 101 L534 55 L546 70 L573 110 L588 130 L579 150 L588 175 L567 188 L540 183 L510 185 L483 200 L474 250 L450 290 L405 325 L375 350 L345 355 L321 325 Z";

function stop(name: string): Stop {
  const s = STOPS.find((x) => x.name === name);
  if (!s) throw new Error(`RouteMap: unknown stop "${name}"`);
  return s;
}

/* Hop distance from Langkawi over the link graph. Borneo is not connected
   by road, so its stops start after the peninsula has finished drawing. */
function hopDepths(): Map<string, number> {
  const depth = new Map<string, number>([["Langkawi", 0]]);
  const queue = ["Langkawi"];
  while (queue.length) {
    const cur = queue.shift() as string;
    const d = depth.get(cur) as number;
    for (const [a, b] of LINKS) {
      const other = a === cur ? b : b === cur ? a : null;
      if (other && !depth.has(other)) {
        depth.set(other, d + 1);
        queue.push(other);
      }
    }
  }
  const maxPeninsula = Math.max(...depth.values());
  const borneoOrder = ["Kuching", "Miri", "Kota Kinabalu", "Sandakan"];
  borneoOrder.forEach((name, i) => depth.set(name, maxPeninsula + 1 + i));
  return depth;
}

const DEPTH = hopDepths();
const LANGKAWI = stop("Langkawi");

function linkPath(a: Stop, b: Stop) {
  // Gentle arc so overlapping links stay readable.
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const bend = Math.min(28, len * 0.14);
  const cx = mx + (dy / len) * -bend;
  const cy = my + (dx / len) * bend;
  return `M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`;
}

function labelPos(s: Stop) {
  switch (s.label) {
    case "l":
      return { x: s.x - 9, y: s.y + 4, anchor: "end" as const };
    case "b":
      return { x: s.x, y: s.y + 18, anchor: "middle" as const };
    case "t":
      return { x: s.x, y: s.y - 11, anchor: "middle" as const };
    default:
      return { x: s.x + 9, y: s.y + 4, anchor: "start" as const };
  }
}

export function RouteMap() {
  return (
    <svg
      viewBox="0 0 640 380"
      role="img"
      aria-labelledby="routemap-title routemap-desc"
      className="h-auto w-full"
    >
      <title id="routemap-title">Where Heavenly Travel drives</title>
      <desc id="routemap-desc">
        A map of Malaysia marking cities served: Langkawi, Alor Setar, Penang,
        Ipoh, the Cameron Highlands, Kota Bharu, Kuala Terengganu, Kuala Lumpur,
        Kuantan, Melaka, Johor Bahru, Kuching, Miri, Kota Kinabalu and Sandakan,
        with roads drawn between neighbouring cities.
      </desc>

      {/* land */}
      <path
        d={PENINSULA}
        fill="rgba(255,255,255,0.09)"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1"
      />
      <path
        d={BORNEO}
        fill="rgba(255,255,255,0.09)"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1"
      />
      <circle
        cx={LANGKAWI.x}
        cy={LANGKAWI.y}
        r="6"
        fill="rgba(255,255,255,0.12)"
        stroke="rgba(255,255,255,0.3)"
      />

      {/* sea label */}
      <text
        x="235"
        y="150"
        fill="rgba(255,255,255,0.35)"
        fontSize="11"
        letterSpacing="0.04em"
      >
        South China Sea
      </text>

      {/* roads: asphalt under-line, then the gold marking drawn over it */}
      {LINKS.map(([a, b]) => {
        const d = linkPath(stop(a), stop(b));
        const i = Math.min(DEPTH.get(a) ?? 0, DEPTH.get(b) ?? 0);
        const style = { "--i": i } as React.CSSProperties;
        return (
          <g key={`${a}-${b}`} fill="none" strokeLinecap="round">
            <path
              d={d}
              pathLength={1}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="6"
              className={styles.road}
              style={style}
            />
            <path
              d={d}
              pathLength={1}
              stroke="#e4a93c"
              strokeWidth="2"
              className={styles.road}
              style={style}
            />
          </g>
        );
      })}

      {/* pins + labels */}
      {STOPS.map((s) => {
        const p = labelPos(s);
        const i = DEPTH.get(s.name) ?? 0;
        return (
          <g
            key={s.name}
            className={styles.pin}
            style={{ "--i": i } as React.CSSProperties}
          >
            <circle
              cx={s.x}
              cy={s.y}
              r={s.major ? 5 : 3.2}
              fill={s.major ? "#e4a93c" : "#ffffff"}
              stroke="#0c3b3a"
              strokeWidth={s.major ? 2 : 1.5}
            />
            <text
              x={p.x}
              y={p.y}
              textAnchor={p.anchor}
              fill="#ffffff"
              fontSize={s.major ? undefined : 10.5}
              fontWeight={s.major ? 600 : 400}
              className={s.major ? styles.labelMajor : "hidden sm:block"}
            >
              {s.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
