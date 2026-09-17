import { FLEET, ringgit } from "../../../_lib/content";
import { label, monoFont, slabFont } from "../_lib/ui";
import { InterludeHeading, interludeLede } from "./Interludes";

const th = `${label} py-3 pr-4 text-left font-normal text-(--muted)`;
const figure = `${monoFont} py-4 pr-4 text-[15px]`;

/** The fleet as a timetable. The row for the chosen group size is marked. */
export function FleetTable({
  selectedId,
  passengers,
}: {
  selectedId: string;
  passengers: number;
}) {
  return (
    <>
      <InterludeHeading>What you are sitting in.</InterludeHeading>
      <p className={interludeLede}>
        Five vehicles, one rule: the smallest one that seats everybody and their
        bags. For {passengers} {passengers === 1 ? "person" : "people"} that is
        the marked row.
      </p>
      <div className="mt-10 overflow-x-auto">
        <table className="w-full border-collapse border-t-2 border-(--fg)">
          <caption className="sr-only">
            Fleet: seats, luggage, indicative day rate and guest rating
          </caption>
          <thead>
            <tr className="border-b border-(--line)">
              <th scope="col" className={`${th} pl-5`}>
                Vehicle
              </th>
              <th scope="col" className={`${th} text-right`}>
                Seats
              </th>
              <th scope="col" className={`${th} hidden md:table-cell`}>
                Luggage
              </th>
              <th scope="col" className={`${th} hidden xl:table-cell`}>
                On board
              </th>
              <th scope="col" className={`${th} text-right`}>
                From, a day
              </th>
              <th
                scope="col"
                className={`${th} hidden text-right sm:table-cell`}
              >
                Rated
              </th>
            </tr>
          </thead>
          <tbody>
            {FLEET.map((v) => {
              const selected = v.id === selectedId;
              return (
                <tr
                  key={v.id}
                  className={`border-b border-(--line) ${selected ? "bg-(--wash)" : ""}`}
                >
                  <th
                    scope="row"
                    className={`${slabFont} relative py-4 pr-4 pl-5 text-left text-[17px] leading-tight font-semibold sm:text-[18px]`}
                  >
                    {selected && (
                      <span
                        aria-hidden
                        className="absolute top-0 bottom-0 left-0 w-1.5 bg-(--signal)"
                      />
                    )}
                    {v.name}
                    {selected && (
                      <span className={`${label} mt-1 block font-normal`}>
                        Your day
                      </span>
                    )}
                  </th>
                  <td className={`${figure} text-right`}>
                    {String(v.seats).padStart(2, "0")}
                  </td>
                  <td className={`${figure} hidden md:table-cell`}>
                    {v.luggage}
                  </td>
                  <td className="hidden py-4 pr-4 text-[15px] leading-snug text-(--muted) xl:table-cell">
                    {v.perks.join(", ")}
                  </td>
                  <td className={`${figure} text-right whitespace-nowrap`}>
                    {ringgit(v.fromPerDay)}
                  </td>
                  <td
                    className={`${figure} hidden text-right whitespace-nowrap sm:table-cell`}
                  >
                    {`${v.rating.toFixed(1)} (${v.reviews})`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p
        className={`${label} mt-5 max-w-[60ch] leading-relaxed text-(--muted)`}
      >
        Day rates are indicative. A quote confirms the price for your route and
        date.
      </p>
    </>
  );
}
