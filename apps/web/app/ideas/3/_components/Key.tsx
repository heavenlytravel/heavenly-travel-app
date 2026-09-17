import styles from "../page.module.css";
import { FLEET, ringgit } from "../../../_lib/content";

/** Road classes, lightest to heaviest, matched to FLEET by vehicle id. */
const SAMPLES: Record<string, string | undefined> = {
  sedan: styles.sampleSedan,
  mpv: styles.sampleMpv,
  van: styles.sampleVan,
  minibus: styles.sampleMinibus,
  coach: styles.sampleCoach,
};

const head =
  "text-[11px] font-semibold tracking-[0.14em] text-(--ink-soft) uppercase";

/** The fleet, set out as an atlas key: one line sample per vehicle class. */
export function Key() {
  return (
    <div className="border border-(--ink)">
      <div
        aria-hidden="true"
        className={`${head} hidden grid-cols-[6rem_minmax(0,1.6fr)_4.5rem_minmax(0,1fr)_7rem] gap-x-5 border-b border-(--ink) px-5 py-2 md:grid`}
      >
        <span>Line</span>
        <span>Vehicle class</span>
        <span>Seats</span>
        <span>Luggage</span>
        <span className="text-right">Day rate from</span>
      </div>
      <ol>
        {FLEET.map((v, i) => (
          <li
            key={v.id}
            className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-(--rule) px-4 py-3.5 last:border-b-0 md:grid-cols-[6rem_minmax(0,1.6fr)_4.5rem_minmax(0,1fr)_7rem] md:gap-x-5 md:px-5"
          >
            <span aria-hidden="true" className="flex h-4 items-center">
              <span
                className={`${styles.sample} ${SAMPLES[v.id] ?? styles.sampleSedan}`}
              />
            </span>
            <div className="min-w-0">
              <h3 className="text-[17px] leading-tight font-semibold">
                <span className="mr-2 font-normal text-(--ink-soft)">
                  {i + 1}
                </span>
                {v.name}
              </h3>
              <p
                className={`${styles.italic} mt-0.5 text-[13.5px] leading-snug text-(--ink-soft)`}
              >
                {v.perks.join(". ")}.
              </p>
            </div>
            <p className="text-right text-[17px] font-semibold md:order-last">
              <span className="sr-only">From </span>
              {ringgit(v.fromPerDay)}
              <span className="block text-[11px] font-medium tracking-[0.1em] text-(--ink-soft) uppercase md:hidden">
                a day, from
              </span>
            </p>
            <p className="col-span-2 col-start-2 text-[15px] md:col-span-1 md:col-start-auto">
              {v.seats}
              <span className="md:sr-only"> seats</span>
            </p>
            <p className="col-span-2 col-start-2 text-[15px] text-(--ink-soft) md:col-span-1 md:col-start-auto md:text-(--ink)">
              {v.luggage}
            </p>
          </li>
        ))}
      </ol>
      <div className="border-t border-(--ink) px-4 py-3 md:px-5">
        <p className={head}>On the chart</p>
        <ul className="mt-2 flex flex-wrap gap-x-7 gap-y-2 text-[14px]">
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-4 w-6 border border-(--motorway) bg-(--motorway)"
            />
            Journey chosen
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className={styles.sampleRoute} />
            Its line back to the two places
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-4 w-6 border border-(--rule) bg-(--cross)"
            />
            Row and column under the pointer
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="flex h-4 w-9 items-center">
              <span className={`${styles.sample} ${styles.sampleFerry}`} />
            </span>
            Ferry, counted in the drive time
          </li>
        </ul>
      </div>
    </div>
  );
}
