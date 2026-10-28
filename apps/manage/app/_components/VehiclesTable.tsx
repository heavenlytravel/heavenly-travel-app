import Link from "next/link";
import { modelName, VEHICLE_DOCUMENTS, vehicleDocumentsDue } from "@repo/db";
import type { ListedVehicle } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { locationVehicleHref } from "../_lib/routes";
import { DocumentsDue } from "./DocumentsDue";
import { EmptyRow, Table, TBody, Td, Th, THead } from "./Table";

/**
 * Our vehicles as a table, for a location's Vehicles tab, the list across
 * locations and a class's page at a location: the plate and model, the
 * class where the list holds several, the location where it spans
 * several, the colour and year, the documents due, and whether it is in
 * service. Each opens inside its location. `bare` is for a `flush` card.
 */
export function VehiclesTable({
  vehicles,
  showClass = true,
  showLocation = false,
  bare = false,
  emptyMessage,
}: {
  vehicles: ListedVehicle[];
  showClass?: boolean;
  showLocation?: boolean;
  bare?: boolean;
  emptyMessage: string;
}) {
  const columns = 4 + Number(showClass) + Number(showLocation);
  return (
    <Table bare={bare}>
      <THead>
        <Th>Vehicle</Th>
        {showClass ? <Th>Class</Th> : null}
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
              className={vehicle.isActive ? undefined : "text-slate-500"}
            >
              <Td className="whitespace-nowrap">
                <Link
                  href={locationVehicleHref(vehicle.location.slug, vehicle.id)}
                  className="font-medium tabular-nums underline-offset-4 hover:underline"
                >
                  {vehicle.plate}
                </Link>
                <span className="block text-xs text-slate-500">
                  {modelName(vehicle.vehicleModel)}
                </span>
              </Td>
              {showClass ? (
                <Td className="whitespace-nowrap text-slate-600">
                  {vehicle.vehicleModel.vehicleClass.name}
                </Td>
              ) : null}
              {showLocation ? (
                <Td className="whitespace-nowrap text-slate-600">
                  {vehicle.location.name}
                </Td>
              ) : null}
              <Td className="whitespace-nowrap text-slate-600">
                {vehicle.colour}
                {vehicle.year ? (
                  <span className="block text-xs text-slate-500 tabular-nums">
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
                  <span className="text-slate-500">Not checked</span>
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
