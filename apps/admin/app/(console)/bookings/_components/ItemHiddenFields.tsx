import {
  offersChildSeats,
  PRICE_OVERRIDE_FIELDS,
  TRIP_OPTION_FIELDS,
  tripItemField,
} from "@repo/db";
import { tripInput, type ItemDraft } from "../_lib/trip-form";

/**
 * One item of a booking form as the server reads it: the trip under the
 * website's parameter names, the vehicle, the details and the agreed
 * price, each under `tripItemField` with the item's index. The steps'
 * own inputs have no names, so what a folded step holds still posts, and
 * the create and amend actions parse it with the website's parser and
 * price the trip again; nothing from the browser is trusted.
 */
export function ItemHiddenFields({
  index,
  draft,
  canPrice,
}: {
  index: number;
  draft: ItemDraft;
  /** The agreed price posts only for an admin who may set one (`bookings.create`). */
  canPrice: boolean;
}) {
  const fields: Record<string, string> = {
    ...tripInput(draft.trip),
    [TRIP_OPTION_FIELDS.vehicleClass]: draft.vehicleClassId ?? "",
    [TRIP_OPTION_FIELDS.passengers]: draft.passengers,
    [TRIP_OPTION_FIELDS.flightNumber]: draft.flightNumber,
    [TRIP_OPTION_FIELDS.notes]: draft.notes,
  };
  if (offersChildSeats(draft.trip.category)) {
    fields[TRIP_OPTION_FIELDS.childSeats] = draft.childSeats;
  }
  if (canPrice) {
    fields[PRICE_OVERRIDE_FIELDS.amount] = draft.agreedPrice;
    fields[PRICE_OVERRIDE_FIELDS.reason] = draft.priceReason;
  }
  return Object.entries(fields).map(([name, value]) => (
    <input
      key={name}
      type="hidden"
      name={tripItemField(index, name)}
      value={value}
    />
  ));
}
