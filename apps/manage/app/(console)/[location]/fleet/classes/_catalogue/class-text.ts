/** How a card spells a class's seats: "3" or "1 to 6" */
export function seatsText(vehicleClass: {
  minPassengers: number;
  maxPassengers: number;
}) {
  return vehicleClass.minPassengers === vehicleClass.maxPassengers
    ? String(vehicleClass.maxPassengers)
    : `${vehicleClass.minPassengers} to ${vehicleClass.maxPassengers}`;
}
