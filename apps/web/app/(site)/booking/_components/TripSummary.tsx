import { tripRows, type TripView } from "@repo/db";
import { PlaceValue, Rows } from "@repo/ui/rows";

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
      typeof value === "string" ? (
        value
      ) : (
        <PlaceValue place={value} size="caption" />
      ),
    ],
  );
  return <Rows rows={[...rows, ...extra]} />;
}
