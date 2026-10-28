"use client";

import { zoneDeleteImpact, type PricedFrom } from "@repo/db";
import { DeleteButton } from "../../../../_components/DeleteButton";
import { deleteZoneAction } from "./actions";

/**
 * The remove button of one zone's row, quiet beside "Edit" since a row
 * needs it rarely. Removing takes the zone's rates with it, other
 * locations' routes to it too, so it asks first and lists what goes
 * (`zoneDeleteImpact`), counted from the routes the row shows; another
 * location's routes ask for the zone's name to be typed.
 */
export function RemoveZone({
  zoneId,
  name,
  routes,
  pricedFrom,
}: {
  zoneId: string;
  name: string;
  /** The priced routes the zone is an end of. */
  routes: number;
  /** The other locations whose grids end at the zone. */
  pricedFrom: PricedFrom;
}) {
  return (
    <DeleteButton
      look="row"
      label="Remove"
      confirmLabel="Remove zone"
      pendingLabel="Removing…"
      ariaLabel={`Remove the zone ${name}`}
      title={`Remove the zone ${name}?`}
      impact={zoneDeleteImpact({ name }, routes, pricedFrom)}
      action={(seen, typed) => deleteZoneAction(zoneId, seen, typed)}
      doneMessage={`Removed the zone ${name}.`}
    />
  );
}
