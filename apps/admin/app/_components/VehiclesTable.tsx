import Link from "next/link";
import { VEHICLE_DOCUMENTS, vehicleDocumentsDue } from "@repo/db";
import type { VehicleWithModel } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { locationVehicleHref } from "../_lib/routes";
import { DocumentsDue } from "./DocumentsDue";
import { EmptyRow, Table, TBody, Td, Th, THead } from "./Table";

/**
 * Our vehicles as a table, for a location's Vehicles tab and the list
 * across locations: the plate and model, the class, the location where
 * the list spans several, the colour and year, the documents due, and
 * whether it is in service. Each opens inside its location.
 */
export function VehiclesTable({
  vehicles,
  showLocation = false,
  emptyMessage,
}: {
  vehicles: VehicleWithModel[];
  showLocation?: boolean;
  emptyMessage: string;
}) {
  const columns = showLocation ? 6 : 5;
  return (
    <Table>
      <THead>
        <Th>Vehicle</Th>
        <Th>Class</Th>
        {showLocation ? <Th>Based at</Th> : null}
        <Th>Colour</Th>
        <Th>Documents</Th>
        <Th>Status</Th>
      </THead>
      <TBody>
        {vehicles.length === 0 ? (
          <EmptyRow colSpan={columns}>{emptyMessage}</EmptyRow>
        ) : (
          vehicles.map((vehicle) => (
            <tr
              key={vehicle.id}
              className={vehicle.isActive ? undefined : "text-neutral-500"}
            >
              <Td className="whitespace-nowrap">
                <Link
                  href={locationVehicleHref(vehicle.location.slug, vehicle.id)}
                  className="font-medium tabular-nums underline-offset-4 hover:underline"
                >
                  {vehicle.plate}
                </Link>
                <span className="block text-xs text-neutral-500">
                  {vehicle.vehicleModel.name}
                </span>
              </Td>
              <Td className="whitespace-nowrap text-neutral-600">
                {vehicle.vehicleModel.vehicleClass.name}
              </Td>
              {showLocation ? (
                <Td className="whitespace-nowrap text-neutral-600">
                  {vehicle.location.name}
                </Td>
              ) : null}
              <Td className="whitespace-nowrap text-neutral-600">
                {vehicle.colour}
                {vehicle.year ? (
                  <span className="block text-xs text-neutral-500 tabular-nums">
                    {vehicle.year}
                  </span>
                ) : null}
              </Td>
              <Td className="min-w-56">
                {vehicle.isActive ? (
                  <DocumentsDue
                    due={vehicleDocumentsDue(vehicle)}
                    anyEntered={VEHICLE_DOCUMENTS.some((key) => vehicle[key])}
                  />
                ) : (
                  <span className="text-neutral-500">Not checked</span>
                )}
              </Td>
              <Td className="whitespace-nowrap">
                <Badge tone={vehicle.isActive ? "green" : "neutral"}>
                  {vehicle.isActive ? "In service" : "Out of service"}
                </Badge>
              </Td>
            </tr>
          ))
        )}
      </TBody>
    </Table>
  );
}
