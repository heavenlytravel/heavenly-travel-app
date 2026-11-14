"use client";

import { useState } from "react";
import type { TripCategory } from "@repo/db";
import { toast } from "@repo/ui/toast";
import { TripSearchPanel } from "../../../../_components/search/SearchCard";
import { useTripRows } from "../../../../_components/search/useTripRows";
import { tripBookingPath } from "../../../../_lib/transportation-booking";
import type { PlannedTrip } from "../../../../_lib/trip-plan";
import { updatePlan } from "../../../../_lib/trip-plan-store";
import { useNavigate } from "../../../../_lib/useNavigate";

/**
 * The plan's trips at the top of each booking step, in the search card's
 * rows and look, each open to change. "Search" checks them and puts them
 * and the group's size in the plan. On the vehicle page that prices them
 * again in place; on a later step (`backToVehicles`) it goes back to the
 * vehicle page, where the new prices and the vehicle are seen again. Why
 * a trip cannot be priced shows at its row (`alertsOf`).
 */
export function PlanTrips({
  category,
  trips,
  passengers,
  summary,
  alertsOf,
  backToVehicles = false,
  className = "",
}: {
  category: TripCategory;
  trips: readonly PlannedTrip[];
  passengers: number;
  /** The bar's last words under the header: the group, the vehicle, the total. */
  summary: string;
  alertsOf?: (id: string) => string[];
  backToVehicles?: boolean;
  className?: string;
}) {
  const rows = useTripRows(trips);
  const [group, setGroup] = useState(passengers);
  const { pending, go } = useNavigate();
  return (
    <TripSearchPanel
      category={category}
      trips={rows}
      passengers={group}
      onPassengers={setGroup}
      pending={pending}
      alertsOf={alertsOf}
      summary={summary}
      plain
      onSend={(sent) => {
        updatePlan((now) => ({ ...now, trips: sent, passengers: group }));
        if (backToVehicles) go(tripBookingPath(category));
        else toast.success(sent.length > 1 ? "Trips updated" : "Trip updated");
      }}
      className={className}
    />
  );
}
