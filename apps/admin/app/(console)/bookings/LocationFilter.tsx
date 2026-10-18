"use client";

import type { BookingStatus, LocationName } from "@repo/db/server";
import { Select } from "@repo/ui/select";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { bookingsHref } from "../../_lib/routes";

/**
 * Narrows the queue to one location's bookings; "" for every location.
 * Builds the list's address itself, keeping the status filter, since a
 * server page cannot hand a client component a function.
 */
export function LocationFilter({
  locations,
  value,
  status,
}: {
  locations: LocationName[];
  value: string;
  /** The status filter in force, kept when the location changes. */
  status: BookingStatus | undefined;
}) {
  const id = useId();
  const router = useRouter();
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <span className="text-neutral-600">Location</span>
      <Select
        id={id}
        value={value}
        onValueChange={(next) =>
          router.push(bookingsHref({ status, location: next || undefined }))
        }
        options={[
          { value: "", label: "All locations" },
          ...locations.map((location) => ({
            value: location.id,
            label: location.name,
          })),
        ]}
        className="w-auto min-w-40"
      />
    </label>
  );
}
