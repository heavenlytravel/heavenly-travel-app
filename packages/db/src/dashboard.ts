import { localDayRange } from "./booking-rules";
import type { BookingStatus, ItemStatus } from "./booking-status";
import { db } from "./client";

/**
 * The Dashboard's numbers, one query each, all real. Cards for Sales and
 * Finance arrive with their features; nothing here is invented. See
 * docs/260930-admin-teams-and-access.md, "The Dashboard is the same for
 * everyone".
 */
export type DashboardCounts = {
  /** Bookings still waiting for Reservation to confirm. */
  awaitingConfirmation: number;
  /** Confirmed bookings whose first pick-up is still ahead. */
  confirmedUpcoming: number;
  /** Live items picking up today, Malaysian time. */
  pickupsToday: number;
  /** Confirmed items ahead that Operation has not assigned a driver to. */
  awaitingDriver: number;
  /** Districts switched on, across every state. */
  activeDistricts: number;
  activeVehicleClasses: number;
};

export async function dashboardCounts(
  now: Date = new Date(),
): Promise<DashboardCounts> {
  const today = localDayRange(now);
  const [
    awaitingConfirmation,
    confirmedUpcoming,
    pickupsToday,
    awaitingDriver,
    activeDistricts,
    activeVehicleClasses,
  ] = await Promise.all([
    db.booking.count({
      where: { status: "received" satisfies BookingStatus },
    }),
    db.booking.count({
      where: {
        status: "confirmed" satisfies BookingStatus,
        startsAt: { gte: now },
      },
    }),
    db.bookingItem.count({
      where: {
        status: { not: "cancelled" satisfies ItemStatus },
        startsAt: { gte: today.start, lt: today.end },
      },
    }),
    db.bookingItem.count({
      where: {
        status: "confirmed" satisfies ItemStatus,
        startsAt: { gte: now },
      },
    }),
    db.district.count({ where: { isActive: true } }),
    db.vehicleClass.count({ where: { isActive: true } }),
  ]);
  return {
    awaitingConfirmation,
    confirmedUpcoming,
    pickupsToday,
    awaitingDriver,
    activeDistricts,
    activeVehicleClasses,
  };
}
