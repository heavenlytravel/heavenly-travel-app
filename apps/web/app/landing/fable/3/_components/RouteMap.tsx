import styles from "../page.module.css";

/* A simplified, stylised Peninsular Malaysia drawn from rough lon/lat
   points so the stops sit in the right places relative to each other. */

const LON0 = 99.45;
const LAT0 = 6.95;
const SCALE = 92;

const px = (lon: number, lat: number): [number, number] => [
  Math.round((lon - LON0) * SCALE * 10) / 10,
  Math.round((LAT0 - lat) * SCALE * 10) / 10,
];

const coast: [number, number][] = [
  [100.12, 6.7], [100.4, 6.55], [100.8, 6.45], [101.1, 6.25], [101.6, 5.9],
  [101.9, 5.85], [102.1, 6.2], [102.3, 6.2], [102.6, 5.85], [103.0, 5.6],
  [103.2, 5.3], [103.4, 4.8], [103.45, 4.2], [103.35, 3.8], [103.45, 3.3],
  [103.7, 2.8], [103.85, 2.4], [104.1, 1.9], [104.25, 1.5], [104.0, 1.35],
  [103.75, 1.4], [103.4, 1.35], [103.0, 1.7], [102.6, 1.95], [102.3, 2.15],
  [102.0, 2.5], [101.7, 2.9], [101.3, 3.2], [101.0, 3.7], [100.8, 4.3],
  [100.6, 4.8], [100.4, 5.2], [100.4, 5.6], [100.3, 6.0], [100.2, 6.4],
];

const toPath = (pts: [number, number][], close = false) =>
  pts
    .map(([lon, lat], i) => {
      const [x, y] = px(lon, lat);
      return `${i === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ") + (close ? " Z" : "");

type Stop = {
  name: string;
  lon: number;
  lat: number;
  side: "left" | "right" | "below";
  delay: number;
  origin?: boolean;
};

const stops: Stop[] = [
  { name: "Langkawi", lon: 99.8, lat: 6.35, side: "below", delay: 0.3, origin: true },
  { name: "Penang", lon: 100.3, lat: 5.4, side: "left", delay: 0.9 },
  { name: "Cameron Highlands", lon: 101.38, lat: 4.47, side: "right", delay: 1.4 },
  { name: "Kuala Lumpur", lon: 101.69, lat: 3.14, side: "left", delay: 1.8 },
  { name: "Melaka", lon: 102.25, lat: 2.19, side: "left", delay: 2.2 },
  { name: "Johor Bahru", lon: 103.76, lat: 1.46, side: "right", delay: 2.6 },
  { name: "Kuantan", lon: 103.33, lat: 3.8, side: "right", delay: 3.1 },
  { name: "Kuala Terengganu", lon: 103.14, lat: 5.33, side: "right", delay: 3.5 },
  { name: "Kota Bharu", lon: 102.24, lat: 6.13, side: "right", delay: 3.9 },
];

const mainRoute: [number, number][] = [
  [99.8, 6.35], [100.3, 6.1], [100.3, 5.4], [100.7, 4.9], [101.09, 4.6],
  [101.38, 4.47], [101.69, 3.14], [102.25, 2.19], [103.0, 1.7], [103.76, 1.46],
];

const eastRoute: [number, number][] = [
  [101.69, 3.14], [102.5, 3.5], [103.33, 3.8], [103.14, 5.33], [102.6, 5.85],
  [102.24, 6.13],
];

export function RouteMap() {
  const [lkX, lkY] = px(99.8, 6.35);
  const [pgX, pgY] = px(100.25, 5.38);

  return (
    <svg
      viewBox="0 0 500 545"
      role="img"
      aria-labelledby="route-map-title route-map-desc"
      className="h-auto w-full max-w-[440px]"
    >
      <title id="route-map-title">Routes Heavenly Travel drives across Peninsular Malaysia</title>
      <desc id="route-map-desc">
        A map of Peninsular Malaysia with a road route from Langkawi through Penang, the Cameron
        Highlands, Kuala Lumpur and Melaka to Johor Bahru, and a second route from Kuala Lumpur up
        the East Coast through Kuantan and Kuala Terengganu to Kota Bharu.
      </desc>

      {/* Land */}
      <path
        d={toPath(coast, true)}
        fill="#e4ede6"
        stroke="#b9c9bf"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Langkawi and Penang islands */}
      <ellipse cx={lkX} cy={lkY} rx="11" ry="8" fill="#e4ede6" stroke="#b9c9bf" strokeWidth="1.5" />
      <ellipse cx={pgX} cy={pgY} rx="6" ry="8" fill="#e4ede6" stroke="#b9c9bf" strokeWidth="1.5" />

      {/* Road under-line (asphalt), then the yellow marking drawn over it */}
      <path
        d={toPath(mainRoute)}
        fill="none"
        stroke="#0c2340"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className={styles.routeLine}
      />
      <path
        d={toPath(mainRoute)}
        fill="none"
        stroke="#f5b800"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className={styles.routeLine}
      />
      <path
        d={toPath(eastRoute)}
        fill="none"
        stroke="#0c2340"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className={`${styles.routeLine} ${styles.routeLineEast}`}
      />
      <path
        d={toPath(eastRoute)}
        fill="none"
        stroke="#f5b800"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className={`${styles.routeLine} ${styles.routeLineEast}`}
      />

      {/* Stops */}
      {stops.map((s) => {
        const [x, y] = px(s.lon, s.lat);
        const anchor = s.side === "left" ? "end" : s.side === "right" ? "start" : "middle";
        const dx = s.side === "left" ? -12 : s.side === "right" ? 12 : 0;
        const dy = s.side === "below" ? 26 : 4.5;
        return (
          <g key={s.name} className={styles.stop} style={{ animationDelay: `${s.delay}s` }}>
            {s.origin ? (
              <>
                <circle cx={x} cy={y} r="9" fill="#f5b800" />
                <circle cx={x} cy={y} r="4" fill="#0c2340" />
              </>
            ) : (
              <circle cx={x} cy={y} r="5.5" fill="#ffffff" stroke="#0c2340" strokeWidth="2.5" />
            )}
            <text
              x={x + dx}
              y={y + dy}
              textAnchor={anchor}
              fontSize="13"
              fontWeight={s.origin ? 700 : 600}
              fill="#0c2340"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {s.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
