/**
 * The clock and the sky for /ideas/4. The page is one day, 06:00 to 22:00;
 * every block knows the minutes it covers and paints that stretch of sky.
 */

export const DAY_START = 6 * 60;
export const DAY_END = 22 * 60;

/** The golden-hour photograph sits at 18:30 on every day sheet. */
export const GOLDEN_AT = 18 * 60 + 30;

/**
 * From here on the page is dark and the text is light. Between GOLDEN_AT and
 * DUSK_AT the sky passes through browns where neither ink nor paper reaches
 * AA, so that stretch carries the photograph and no text.
 */
export const DUSK_AT = 19 * 60 + 30;

export const SKY = {
  preDawn: "#dde3ea",
  morning: "#cfe6f2",
  noon: "#f4f7f2",
  golden: "#f6b66b",
  dusk: "#101b33",
  night: "#0a1226",
} as const;

const KEYS: ReadonlyArray<{ at: number; hex: string }> = [
  { at: DAY_START, hex: SKY.preDawn },
  { at: 9 * 60, hex: SKY.morning },
  { at: 12 * 60 + 30, hex: SKY.noon },
  { at: GOLDEN_AT, hex: SKY.golden },
  { at: DUSK_AT, hex: SKY.dusk },
  { at: DAY_END, hex: SKY.night },
];

export function toMinutes(time: string): number {
  const [h = "0", m = "0"] = time.split(":");
  return Number(h) * 60 + Number(m);
}

export function toClock(minutes: number): string {
  const whole = Math.round(minutes);
  const h = Math.floor(whole / 60);
  const m = whole % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Position of a time on the 06:00 to 22:00 rail, 0 to 1. */
export function dayFraction(minutes: number): number {
  const f = (minutes - DAY_START) / (DAY_END - DAY_START);
  return Math.min(1, Math.max(0, f));
}

function channels(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Sky colour at a time of day, interpolated between the palette keys. */
export function skyAt(minutes: number): string {
  const t = Math.min(DAY_END, Math.max(DAY_START, minutes));
  const next = KEYS.findIndex((k) => k.at >= t);
  const b = KEYS[next] ?? KEYS[KEYS.length - 1]!;
  const a = KEYS[Math.max(0, next - 1)] ?? b;
  if (a.at === b.at) return b.hex;
  const p = (t - a.at) / (b.at - a.at);
  const [r1, g1, b1] = channels(a.hex);
  const [r2, g2, b2] = channels(b.hex);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * p);
  return `rgb(${mix(r1, r2)} ${mix(g1, g2)} ${mix(b1, b2)})`;
}

/** A vertical gradient covering from..to, passing through any keys between. */
export function skyGradient(from: number, to: number): string {
  if (to <= from) return skyAt(from);
  const inner = KEYS.filter((k) => k.at > from && k.at < to).map(
    (k) => `${k.hex} ${(((k.at - from) / (to - from)) * 100).toFixed(1)}%`,
  );
  return `linear-gradient(to bottom, ${[skyAt(from), ...inner, skyAt(to)].join(", ")})`;
}

export type Tone = "day" | "night";

export function toneAt(minutes: number): Tone {
  return minutes >= DUSK_AT ? "night" : "day";
}
