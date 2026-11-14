/** A trip's number in a booking, in a small brand-blue disc: beside "Trip" on each row of the trip forms. */
export function TripNumber({
  value,
  small = false,
}: {
  value: number;
  small?: boolean;
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-brand font-bold text-white ${
        small ? "size-[22px] text-2xs" : "size-6 text-xs"
      }`}
    >
      {value}
    </span>
  );
}
