/**
 * Top-down seat plans, drawn from data. Each vehicle is a list of rows from
 * the front of the vehicle to the back; each row is read across the cabin
 * from the driver's side (Malaysia drives on the right-hand seat) to the
 * kerb side. The plan is laid out with the front of the vehicle on the left.
 *
 *   D driver   P passenger seat   C crew seat, never sold   . floor
 */

import type { VehicleId } from "../../../_lib/routes";

type Spec = {
  rows: string[];
  /** Distance between seat rows, in plan units. */
  pitch: number;
  /** Length of the bonnet or windscreen section. */
  nose: number;
  /** Length of the boot or luggage bay. */
  bay: number;
  /** Corner radius of the body. */
  radius: number;
  /** Row that has the passenger door on the kerb side, for buses. */
  doorRow?: number;
};

const COACH_ROW = "PP.PP";

const SPECS: Record<VehicleId, Spec> = {
  sedan: { rows: ["D.P", "P.P"], pitch: 50, nose: 70, bay: 56, radius: 26 },
  mpv: {
    rows: ["D.C", "P.P", "P.P", "P.P"],
    pitch: 48,
    nose: 44,
    bay: 32,
    radius: 22,
  },
  van: {
    rows: ["D..P", "P.PP", "P.PP", "P.PP"],
    pitch: 48,
    nose: 32,
    bay: 32,
    radius: 16,
  },
  minibus: {
    rows: ["D...C", "PP...", ...Array<string>(6).fill(COACH_ROW)],
    pitch: 40,
    nose: 14,
    bay: 36,
    radius: 10,
    doorRow: 1,
  },
  coach: {
    rows: ["D....", ...Array<string>(11).fill(COACH_ROW)],
    pitch: 40,
    nose: 14,
    bay: 46,
    radius: 10,
    doorRow: 0,
  },
};

export const SEAT = 30;
const COLUMN = 36;
const AISLE = 22;
/** Thickness of the body around the cabin floor. */
export const RING = 8;
const PAD = 8;
/** How far the wheels stick out past the body. */
export const WHEEL = 5;

export type SeatKind = "pax" | "driver" | "crew";

export type PlanSeat = {
  kind: SeatKind;
  x: number;
  y: number;
  /** Order in which passenger seats fill; -1 for driver and crew. */
  index: number;
};

export type PlanLayout = {
  id: VehicleId;
  /** Size of the drawing, wheels included. */
  width: number;
  height: number;
  /** Size of the body itself. */
  length: number;
  beam: number;
  nose: number;
  bay: number;
  radius: number;
  seats: PlanSeat[];
  capacity: number;
  doorX: number | null;
  wheelsX: [number, number];
};

function build(id: VehicleId): PlanLayout {
  const spec = SPECS[id];
  const columns = spec.rows[0]?.length ?? 0;

  const ys: number[] = [];
  let offset = RING + PAD;
  let lastSeatEdge = offset;
  for (let c = 0; c < columns; c++) {
    const isAisle = spec.rows.every((row) => row[c] === ".");
    ys.push(offset);
    if (!isAisle) lastSeatEdge = offset + SEAT;
    offset += isAisle ? AISLE : COLUMN;
  }
  const beam = lastSeatEdge + PAD + RING;

  const xOf = (row: number) => spec.nose + PAD + row * spec.pitch;
  const length = xOf(spec.rows.length - 1) + SEAT + PAD + spec.bay;

  const seats: PlanSeat[] = [];
  let index = 0;
  spec.rows.forEach((row, r) => {
    [...row].forEach((cell, c) => {
      if (cell === ".") return;
      const kind: SeatKind =
        cell === "D" ? "driver" : cell === "C" ? "crew" : "pax";
      seats.push({
        kind,
        x: xOf(r),
        y: WHEEL + (ys[c] ?? 0),
        index: kind === "pax" ? index++ : -1,
      });
    });
  });

  return {
    id,
    width: length,
    height: beam + WHEEL * 2,
    length,
    beam,
    nose: spec.nose,
    bay: spec.bay,
    radius: spec.radius,
    seats,
    capacity: index,
    doorX: spec.doorRow === undefined ? null : xOf(spec.doorRow) - 2,
    wheelsX: [spec.nose + 6, length - spec.bay - 46],
  };
}

export const PLANS: Record<VehicleId, PlanLayout> = {
  sedan: build("sedan"),
  mpv: build("mpv"),
  van: build("van"),
  minibus: build("minibus"),
  coach: build("coach"),
};
