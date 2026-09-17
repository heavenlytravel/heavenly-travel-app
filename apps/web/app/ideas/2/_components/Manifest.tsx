"use client";

import styles from "../page.module.css";
import { ringgit } from "../../../_lib/content";
import {
  PLACES,
  driveMinutes,
  formatDrive,
  oneWayFare,
  placeById,
  type PlaceId,
} from "../../../_lib/routes";
import { plural } from "../_lib/headcount";
import { eyebrow, primaryButton } from "../_lib/styles";
import { WhatsAppIcon } from "../../../_components/WhatsAppIcon";
import { useHeadcount } from "./HeadcountProvider";

const cell =
  "flex min-w-0 flex-col justify-between gap-1 bg-[#F7F4EC] px-4 py-3 sm:px-5";
const wideCell = `${cell} col-span-2 sm:col-span-1`;
const figure = `${styles.wide} text-xl leading-tight font-extrabold tabular-nums sm:text-2xl`;

function lowerFirst(text: string) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function isPlaceId(value: string): value is PlaceId {
  return PLACES.some((p) => p.id === value);
}

function PlaceSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: PlaceId;
  onChange: (value: PlaceId) => void;
}) {
  return (
    <div className={wideCell}>
      <label htmlFor={id} className={eyebrow}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          if (isPlaceId(e.target.value)) onChange(e.target.value);
        }}
        className={`${styles.field} ${styles.select} ${styles.wide}`}
      >
        {PLACES.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * The rest of the trip, written as one line under the numeral: from, to,
 * on, then what it costs, how long it takes and the button that sends it.
 */
export function Manifest() {
  const {
    count,
    party,
    from,
    to,
    date,
    setFrom,
    setTo,
    setDate,
    whatsappHref,
  } = useHeadcount();

  const samePlace = from === to;
  const fare = oneWayFare(party.vehicleId, from, to) * party.vehicles;
  const notes = [placeById(from), placeById(to)]
    .filter((p, i, all) => p.note && all.indexOf(p) === i)
    .map((p) => `${p.name}: ${lowerFirst(p.note ?? "")}.`);

  return (
    <form
      aria-label="Your trip"
      onSubmit={(e) => e.preventDefault()}
      className="mt-10 lg:mt-14"
    >
      <div className="grid grid-cols-2 gap-[2px] border-2 border-[#141414] bg-[#141414] lg:grid-cols-[1.15fr_1.15fr_0.9fr_1.1fr_0.8fr_auto]">
        <PlaceSelect
          id="hc-from"
          label="From"
          value={from}
          onChange={setFrom}
        />
        <PlaceSelect id="hc-to" label="To" value={to} onChange={setTo} />

        <div className={wideCell}>
          <label htmlFor="hc-date" className={eyebrow}>
            On
          </label>
          <input
            id="hc-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${styles.field} ${styles.wide}`}
          />
        </div>

        <div className={cell}>
          <p className={eyebrow}>
            {samePlace ? "By the day" : `One way, ${party.label.toLowerCase()}`}
          </p>
          <p className={figure}>{ringgit(samePlace ? party.dayRate : fare)}</p>
        </div>
        <div className={cell}>
          <p className={eyebrow}>{samePlace ? "Drive" : "Drive time"}</p>
          <p className={figure}>
            {samePlace ? "Local" : formatDrive(driveMinutes(from, to))}
          </p>
        </div>

        <div className="col-span-2 flex items-stretch bg-[#F7F4EC] p-2 sm:col-span-1">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`${primaryButton} w-full whitespace-nowrap`}
          >
            <WhatsAppIcon />
            Send on WhatsApp
          </a>
        </div>
      </div>

      <p className="mt-3 max-w-4xl text-sm leading-relaxed">
        {samePlace
          ? `Same place at both ends, so this is a local job: ${placeById(from).name} by the day, driver included. `
          : `${ringgit(fare)} is for the whole ${party.vehicles > 1 ? "convoy" : "vehicle"}, about ${ringgit(Math.round(fare / count))} a head for ${plural(count, "person", "people")}. `}
        {notes.join(" ")} Prices here are indicative. The quote we send back
        confirms the final figure.
      </p>
    </form>
  );
}
