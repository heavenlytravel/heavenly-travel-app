"use client";

import {
  PART_ROLE_LABELS,
  suppliesIt,
  type AssignTrip,
  type PartRole,
} from "@repo/db";
import type { Candidate, VendorOption } from "@repo/db/server";
import { Card, CardTitle } from "@repo/console/Card";
import { AssignStateBadge } from "@repo/console/StatusBadges";
import { Checkbox } from "@repo/ui/field";
import { useState } from "react";
import { AssignForm } from "./AssignForm";

/** One role still to assign, as its card asks it. */
export type OpenRole = {
  role: PartRole;
  /** The line under its title: what to choose. */
  description: string;
  /** The booking's other trips still needing this role, in order. */
  others: AssignTrip[];
  candidates: Candidate[];
  /** The vendors that supply it, serving the trip's location. */
  vendors: VendorOption[];
};

/**
 * The trip's roles still to assign, a card each. When both the vehicle and
 * the driver are open, a tick above the cards asks them of one vendor,
 * paid together: the two cards become one, "Vehicle and Driver", listing
 * the vendors that supply both. See
 * docs/261111-catalogue-booking-flow-and-ops.md, part D.
 */
export function AssignCards({
  bookingId,
  trip,
  roles,
}: {
  bookingId: string;
  trip: AssignTrip;
  roles: OpenRole[];
}) {
  const [together, setTogether] = useState(false);
  const vehicle = roles.find((r) => r.role === "vehicle");
  const driver = roles.find((r) => r.role === "driver");
  const pairable = vehicle !== undefined && driver !== undefined;
  const both = pairable && together;

  return (
    <>
      {pairable ? (
        <label className="flex items-center gap-3 rounded-card bg-white px-5 py-3.5 text-sm shadow-card">
          <Checkbox
            checked={together}
            onChange={(event) => setTogether(event.currentTarget.checked)}
          />
          <span className="grid gap-0.5">
            <span className="font-semibold text-ink">
              Same vendor for the vehicle and the driver
            </span>
            <span className="text-caption text-muted">
              One vendor supplies both, paid one amount for the two.
            </span>
          </span>
        </label>
      ) : null}
      {roles.map((open) => {
        if (both && open.role === "driver") return null;
        const joint = both && open.role === "vehicle";
        return (
          <Card key={joint ? "vehicle-driver" : open.role}>
            <CardTitle
              action={<AssignStateBadge state="to-assign" />}
              description={
                joint
                  ? "Choose a vendor that supplies both, then their vehicle of the class booked and their driver, or Any to let them assign."
                  : open.description
              }
            >
              {joint ? "Vehicle and Driver" : PART_ROLE_LABELS[open.role]}
            </CardTitle>
            <AssignForm
              // A new form when the cards join or part, so nothing half chosen carries over.
              key={joint ? "joint" : "alone"}
              bookingId={bookingId}
              role={open.role}
              trip={trip}
              others={open.others}
              candidates={open.candidates}
              driverCandidates={joint ? driver!.candidates : undefined}
              withDriver={joint}
              vendors={
                joint
                  ? open.vendors.filter((v) => suppliesIt(v, "driver"))
                  : open.vendors
              }
            />
          </Card>
        );
      })}
    </>
  );
}
