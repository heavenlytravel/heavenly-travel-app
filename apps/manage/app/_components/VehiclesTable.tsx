import Link from "next/link";
import { modelName, VEHICLE_DOCUMENTS, vehicleDocumentsDue } from "@repo/db";
import type { ListedVehicle } from "@repo/db/server";
import { BusIcon, CarIcon } from "@repo/ui/icons";
import { vehicleHref, type ScopeSlug } from "../_lib/routes";
import { DocumentsDue } from "@repo/console/DocumentsDue";
import { ServiceBadge } from "@repo/console/StatusBadges";
import {
  EmptyRow,
  Table,
  TBody,
  Td,
  Th,
  THead,
  TwoLines,
} from "@repo/console/Table";

/**
 * The vehicles as a table, in the scope on screen: the plate and model
 * (and the vendor, when not ours), the class where the list holds
 * several, the location under `~`, the colour and year, the documents
 * due, and whether it is in service. Each opens in the scope it was
 * listed in. The fleet's list and a class's page at a location show
 * it; `bare` is for a `flush` card.
 */
export function VehiclesTable({
  vehicles,
  scope,
  showClass = true,
  bare = false,
  emptyMessage,
}: {
  vehicles: readonly ListedVehicle[];
  scope: ScopeSlug;
  showClass?: boolean;
  bare?: boolean;
  emptyMessage: string;
}) {
  const showLocation = scope === null;
  const columns = 4 + Number(showClass) + Number(showLocation);
  return (
    <Table bare={bare}>
      <THead>
        <Th>Vehicle</Th>
        {showClass ? <Th>Class</Th> : null}
        {showLocation ? <Th>Location</Th> : null}
        <Th>Colour</Th>
        <Th>Documents</Th>
        <Th>Status</Th>
      </THead>
      <TBody>
        {vehicles.length === 0 ? (
          <EmptyRow colSpan={columns}>{emptyMessage}</EmptyRow>
        ) : (
          vehicles.map((vehicle) => {
            const { vehicleClass } = vehicle.vehicleModel;
            return (
              <tr key={vehicle.id}>
                <Td className="whitespace-nowrap">
                  <span className="flex items-center gap-3">
                    <VehicleThumb
                      coach={vehicleClass.category === "coach-charter"}
                    />
                    <TwoLines
                      top={
                        <Link
                          href={vehicleHref(scope, vehicle.id)}
                          className="tabular-nums underline-offset-4 hover:underline"
                        >
                          {vehicle.plate}
                        </Link>
                      }
                      bottom={
                        vehicle.vendor.isOurs
                          ? modelName(vehicle.vehicleModel)
                          : `${modelName(vehicle.vehicleModel)} · ${vehicle.vendor.name}`
                      }
                    />
                  </span>
                </Td>
                {showClass ? (
                  <Td className="whitespace-nowrap">{vehicleClass.name}</Td>
                ) : null}
                {showLocation ? (
                  <Td className="whitespace-nowrap">{vehicle.location.name}</Td>
                ) : null}
                <Td className="whitespace-nowrap">
                  <TwoLines
                    top={vehicle.colour}
                    bottom={
                      vehicle.year ? (
                        <span className="tabular-nums">{vehicle.year}</span>
                      ) : null
                    }
                  />
                </Td>
                <Td className="min-w-56">
                  {vehicle.isActive ? (
                    <DocumentsDue
                      due={vehicleDocumentsDue(vehicle)}
                      anyEntered={VEHICLE_DOCUMENTS.some((key) => vehicle[key])}
                    />
                  ) : (
                    <span className="text-muted">Not checked</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap">
                  <ServiceBadge active={vehicle.isActive} />
                </Td>
              </tr>
            );
          })
        )}
      </TBody>
    </Table>
  );
}

/**
 * The square at the head of a vehicle's row: a car, or a coach for one of
 * coach charter. The list does not read the vehicles' photos.
 */
function VehicleThumb({ coach }: { coach: boolean }) {
  const Icon = coach ? BusIcon : CarIcon;
  return (
    <span
      aria-hidden="true"
      className="grid h-8 w-11 shrink-0 place-items-center rounded-md border border-hairline bg-shade text-muted"
    >
      <Icon />
    </span>
  );
}
