import "server-only";
import { isPlace } from "@repo/db";
import { statesBounds } from "@repo/db/server";
import type {
  AddressArea,
  PickableAddress,
} from "../(console)/[location]/pages/_components/SavedAddressPicker";

/**
 * What a place's saved address is picked from: the location's saved
 * addresses, and where a new one may lie, its states, searched in the box
 * around them.
 */
export function addressChoicesOf(location: {
  addresses: readonly { id: string; name: string; place: unknown }[];
  states: readonly { code: string; name: string }[];
}): { addresses: PickableAddress[]; area: AddressArea } {
  return {
    addresses: location.addresses.flatMap((address) =>
      isPlace(address.place)
        ? [
            {
              id: address.id,
              name: address.name,
              placeId: address.place.placeId,
            },
          ]
        : [],
    ),
    area: {
      stateNames: location.states.map((state) => state.name),
      within: statesBounds(location.states.map((state) => state.code)),
    },
  };
}
