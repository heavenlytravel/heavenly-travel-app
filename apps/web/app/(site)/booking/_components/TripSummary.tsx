import { tripRows, type Place, type TripView } from "@repo/db";
import { Rows } from "../../_components/Page";

function placeLine(place: Place) {
  return (
    <>
      <span className="block">{place.label}</span>
      {place.address !== place.label && (
        <span className="block text-[0.85rem] font-normal text-[#67726f]">
          {place.address}
        </span>
      )}
    </>
  );
}

/** The trip as rows, in the booking pages' style. The rows come from `tripRows`. */
export function TripSummary({
  trip,
  extra = [],
}: {
  trip: TripView;
  /** Rows after the trip itself: passengers, vehicle class. */
  extra?: [label: string, value: React.ReactNode][];
}) {
  const rows: [string, React.ReactNode][] = tripRows(trip).map(
    ([label, value]) => [
      label,
      typeof value === "string" ? value : placeLine(value),
    ],
  );
  return <Rows rows={[...rows, ...extra]} />;
}
