"use client";

import { useRouter } from "next/navigation";
import { useConfirm } from "@repo/ui/alert-dialog";
import { toast } from "@repo/ui/toast";
import { STEP_PATHS } from "../situations";
import { tripsFromSearch, update, useExample, type SearchRow } from "../store";

/**
 * How every search card sends its trips. A new search in place of the trips
 * the customer has asks first; trips opened from the booking are changed in
 * place, and a booking that has its vehicle goes back to the confirm page.
 */
export function useSend() {
  const { search, trips, vehicle } = useExample();
  const router = useRouter();
  const [dialog, confirm] = useConfirm();
  // The cards hold the booking's own trips when they were opened to change them.
  const changing =
    trips.length > 0 && search.some((r) => trips.some((t) => t.id === r.id));
  const priced = changing && vehicle.classId !== null;

  async function send(rows: SearchRow[]) {
    // A new search in place of the trips the customer has: they say so twice.
    if (!changing && trips.length > 0) {
      const count = trips.length === 1 ? "trip" : `${trips.length} trips`;
      const yes = await confirm({
        title: "Start a new booking?",
        description: `This search takes the place of the ${count} you have, with their flight numbers and notes. You cannot undo this.`,
        action: "Start a new booking",
        cancel: `Keep my ${trips.length === 1 ? "trip" : "trips"}`,
        danger: true,
      });
      if (!yes) return;
    }
    update((s) => ({
      ...s,
      search: rows,
      trips: tripsFromSearch(rows, changing ? s.trips : []),
      editing: null,
      // A new booking chooses its vehicle afresh.
      vehicle: changing ? s.vehicle : { ...s.vehicle, classId: null },
    }));
    if (priced) {
      toast.success(rows.length > 1 ? "Trips updated" : "Trip updated");
      router.push(STEP_PATHS.confirm);
    } else {
      router.push(STEP_PATHS.vehicle);
    }
  }

  return { changing, priced, send, dialog };
}
