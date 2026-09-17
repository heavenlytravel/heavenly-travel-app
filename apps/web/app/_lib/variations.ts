export type ModelKey = "opus" | "fable";

export type Run = {
  label: string;
  tokens: number | null;
  toolCalls: number | null;
  durationMs: number | null;
  notes?: string;
};

export type Variation = {
  model: ModelKey;
  option: 1 | 2 | 3;
  href: string;
  seed: string;
  concept: string;
  runs: Run[];
};

export const MODELS: Record<ModelKey, { name: string; id: string }> = {
  opus: { name: "Claude Opus 5", id: "claude-opus-5" },
  fable: { name: "Claude Fable 5.1", id: "claude-fable-5-1" },
};

export const VARIATIONS: Variation[] = [
  {
    model: "opus",
    option: 1,
    href: "/landing/opus/1",
    seed: "Rooted in Langkawi, reaching all of Malaysia",
    concept:
      "Malaysian road-sign plate and booking search over a kite photo, with a regional direction-sign board for pick-ups anywhere.",
    runs: [
      { label: "Initial", tokens: 62854, toolCalls: 31, durationMs: 438059 },
      { label: "Revision 1", tokens: 97821, toolCalls: 40, durationMs: 267922 },
    ],
  },
  {
    model: "opus",
    option: 2,
    href: "/landing/opus/2",
    seed: "The road across Malaysia",
    concept:
      "Expressway signage: a green direction-sign hero and a drawn road down the page, no photography.",
    runs: [
      { label: "Initial", tokens: 54940, toolCalls: 20, durationMs: 369317 },
      { label: "Revision 1", tokens: 72091, toolCalls: 18, durationMs: 148565 },
    ],
  },
  {
    model: "opus",
    option: 3,
    href: "/landing/opus/3",
    seed: "Mix of option 1 and option 2",
    concept:
      "Road-sign plate hero from option 1 crossed with the expressway signage and drawn road of option 2, set in Overpass with the live site's Langkawi photography.",
    runs: [
      { label: "Initial", tokens: 106007, toolCalls: 18, durationMs: 402311 },
    ],
  },
  {
    model: "fable",
    option: 1,
    href: "/landing/fable/1",
    seed: "Rooted in Langkawi, reaching all of Malaysia",
    concept:
      "Island-host warmth in Andaman teal and sunset gold, with an animated Malaysia coverage network as the hero.",
    runs: [
      { label: "Initial", tokens: 77806, toolCalls: 71, durationMs: 607948 },
      {
        label: "Revision 1",
        tokens: 101153,
        toolCalls: 29,
        durationMs: 220322,
      },
    ],
  },
  {
    model: "fable",
    option: 2,
    href: "/landing/fable/2",
    seed: "The road across Malaysia",
    concept:
      "Road network in navy and road-marking yellow, with an animated map and a board of journeys driven every week.",
    runs: [
      { label: "Initial", tokens: 86671, toolCalls: 72, durationMs: 580919 },
      {
        label: "Revision 1",
        tokens: 109291,
        toolCalls: 24,
        durationMs: 203283,
      },
    ],
  },
  {
    model: "fable",
    option: 3,
    href: "/landing/fable/3",
    seed: "Mix of option 1 and option 2",
    concept:
      "Island-host warmth and animated coverage map from option 1 crossed with the road-network board of option 2, set in Overpass with the live site's Langkawi photography.",
    runs: [
      { label: "Initial", tokens: 126134, toolCalls: 25, durationMs: 486530 },
    ],
  },
];

export function formatDuration(ms: number | null) {
  if (ms == null) return "Pending";
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, "0");
  return `${m}m ${s}s`;
}

export function formatTokens(tokens: number | null) {
  return tokens == null ? "Pending" : tokens.toLocaleString("en-US");
}
