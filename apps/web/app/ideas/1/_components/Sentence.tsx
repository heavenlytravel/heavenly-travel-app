"use client";

import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { PLACES } from "../../../_lib/routes";
import {
  SERVICE_LABELS,
  useTrip,
  whatsappHrefFor,
  type ServiceKey,
} from "../../../_lib/trip";
import {
  MAX_PEOPLE,
  SERVICE_PHRASES,
  composeReply,
  formatTripDate,
  parsePeople,
  placeByName,
} from "../_lib/reply";
import styles from "../page.module.css";
import { WhatsAppIcon } from "../../../_components/WhatsAppIcon";

const SERVICE_KEYS = Object.keys(SERVICE_LABELS) as ServiceKey[];

/** Staggers the marker swipes and the reply lines; read by the CSS module. */
function order(i: number): CSSProperties {
  return { "--i": i } as CSSProperties;
}

/**
 * A blank in the sentence. The visible word sizes the blank and carries the
 * marker swipe; the real control lies invisibly over it, so it stays a native,
 * keyboard-operable select or date input with its own accessible name.
 */
function Blank({
  index,
  word,
  children,
}: {
  index: number;
  word: string;
  children: ReactNode;
}) {
  return (
    <span className={styles.blank}>
      {children}
      <span
        aria-hidden="true"
        className={`${styles.marker} ${styles.word}`}
        style={order(index)}
      >
        {word}
      </span>
    </span>
  );
}

function openPicker(input: HTMLInputElement) {
  try {
    input.showPicker();
  } catch {
    // Older browsers: the input still takes typed dates and its own tap.
  }
}

export function Sentence() {
  const { trip, set } = useTrip({
    service: "car",
    from: "Langkawi",
    to: "Penang",
    passengers: "6",
  });

  const people = parsePeople(trip.passengers);
  const from = placeByName(trip.from);
  const to = placeByName(trip.to);
  const when = formatTripDate(trip.date);

  const reply = composeReply({
    people,
    from,
    to,
    service: trip.service,
    date: trip.date,
  });

  // WhatsApp gets the readable date, not the ISO string from the input.
  const whatsappHref = whatsappHrefFor({
    ...trip,
    date: formatTripDate(trip.date, true) ?? "",
  });

  const setPeople = (n: number) =>
    set("passengers", String(Math.min(MAX_PEOPLE, Math.max(1, n))));

  const onCountKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      setPeople(people + (e.key === "ArrowUp" ? 1 : -1));
    }
  };

  const onDateKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker(e.currentTarget);
    }
  };

  return (
    <form aria-label="Your trip" onSubmit={(e) => e.preventDefault()}>
      <p className={styles.sentence}>
        We are{" "}
        <span className="whitespace-nowrap">
          <button
            type="button"
            className={styles.step}
            aria-label="One person fewer"
            disabled={people <= 1}
            onClick={() => setPeople(people - 1)}
          >
            <span aria-hidden="true">-</span>
          </button>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Number of people"
            className={`${styles.marker} ${styles.count}`}
            style={{
              ...order(0),
              width: `${Math.max(1, trip.passengers.length)}ch`,
            }}
            placeholder="?"
            value={trip.passengers}
            onChange={(e) =>
              set("passengers", e.target.value.replace(/\D/g, "").slice(0, 3))
            }
            onKeyDown={onCountKey}
          />
          <button
            type="button"
            className={styles.step}
            aria-label="One person more"
            disabled={people >= MAX_PEOPLE}
            onClick={() => setPeople(people + 1)}
          >
            <span aria-hidden="true">+</span>
          </button>
        </span>{" "}
        {people === 1 ? "person" : "people"} going from{" "}
        <Blank index={1} word={from.name}>
          <select
            aria-label="Going from"
            className={styles.control}
            value={from.name}
            onChange={(e) => set("from", e.target.value)}
          >
            {PLACES.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}, {p.state}
              </option>
            ))}
          </select>
        </Blank>{" "}
        to{" "}
        <Blank index={2} word={to.name}>
          <select
            aria-label="Going to"
            className={styles.control}
            value={to.name}
            onChange={(e) => set("to", e.target.value)}
          >
            {PLACES.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}, {p.state}
              </option>
            ))}
          </select>
        </Blank>{" "}
        on{" "}
        <Blank index={3} word={when ?? "a day we’ll name"}>
          <input
            type="date"
            aria-label="Date of travel"
            className={styles.control}
            value={trip.date}
            onChange={(e) => set("date", e.target.value)}
            onClick={(e) => openPicker(e.currentTarget)}
            onKeyDown={onDateKey}
          />
        </Blank>
        , and we&rsquo;d like{" "}
        <Blank index={4} word={SERVICE_PHRASES[trip.service]}>
          <select
            aria-label="Service"
            className={styles.control}
            value={trip.service}
            onChange={(e) => set("service", e.target.value as ServiceKey)}
          >
            {SERVICE_KEYS.map((k) => (
              <option key={k} value={k}>
                {SERVICE_LABELS[k]}
              </option>
            ))}
          </select>
        </Blank>
        .
      </p>

      <div className="mt-10 grid gap-y-4 border-t border-[#D9D6C8] pt-6 sm:mt-14 lg:grid-cols-[9rem_minmax(0,1fr)] lg:gap-x-12">
        <p className="font-(family-name:--font-reply) text-xs font-medium tracking-[0.14em] text-[#1B2B26] uppercase lg:pt-1.5">
          Heavenly Travel replies
        </p>
        <div className="max-w-[52rem] font-(family-name:--font-reply) text-[#2440C8]">
          <p
            aria-live="polite"
            aria-atomic="true"
            className="text-[1.05rem] leading-[1.6] sm:text-xl sm:leading-[1.55]"
          >
            {reply.map((line, i) => (
              <span
                key={`${i}-${line}`}
                className={styles.line}
                style={order(i)}
              >
                {line}{" "}
              </span>
            ))}
          </p>
          <div className="mt-7 flex flex-col gap-x-6 gap-y-4 sm:flex-row sm:items-center">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 rounded-[2px] bg-[#2440C8] px-5 py-3.5 text-[15px] font-medium text-[#FBFAF4] hover:bg-[#1B2B26] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#2440C8]"
            >
              <WhatsAppIcon />
              Send this on WhatsApp
            </a>
            <p className="max-w-[26rem] text-[13px] leading-normal text-[#1B2B26]">
              Prices here are indicative. We read the message, check the date
              and send a quote that confirms the final price.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
