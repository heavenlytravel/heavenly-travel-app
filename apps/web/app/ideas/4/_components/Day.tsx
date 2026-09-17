"use client";

import { useRef, useState } from "react";
import { WHATSAPP_HREF } from "../../../_lib/content";
import { vehicleFor } from "../../../_lib/routes";
import { useTrip, whatsappHrefFor, type ServiceKey } from "../../../_lib/trip";
import styles from "../page.module.css";
import {
  DEFAULT_DAY,
  dayById,
  sheetBounds,
  sheetFor,
  type DayId,
} from "../_lib/days";
import { DAY_START, SKY, skyGradient, toClock } from "../_lib/sky";
import { label, link, slabFont } from "../_lib/ui";
import { Closing, SiteFooter } from "./Closing";
import { DayPicker } from "./DayPicker";
import { FleetTable } from "./FleetTable";
import { HourRail } from "./HourRail";
import { RunSheet, SHEET_GUTTER, type StaticInterludes } from "./RunSheet";

/** "2026-09-19" to "Sat, 19 Sep 2026", without touching the local time zone. */
function formatDate(iso: string): string | null {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * The whole day: one chosen template and one trip, shared by the hour rail,
 * the picker, the run sheet and the closing call to book.
 */
export function Day({ interludes }: { interludes: StaticInterludes }) {
  const [dayId, setDayId] = useState<DayId>(DEFAULT_DAY.id);
  const day = dayById(dayId);
  const { trip, set } = useTrip({
    from: DEFAULT_DAY.from,
    passengers: String(DEFAULT_DAY.passengers),
  });
  const sheetRef = useRef<HTMLDivElement>(null);

  const typed = Number.parseInt(trip.passengers, 10);
  const passengers =
    Number.isFinite(typed) && typed > 0 ? typed : day.passengers;
  const { vehicle, count } = vehicleFor(passengers);
  const service: ServiceKey = vehicle.kind === "coach" ? "coach" : day.service;
  const whatsappHref = whatsappHrefFor({
    ...trip,
    service,
    from: trip.from || day.from,
    to: `${day.to} (${day.title}, ${day.stops.length} stops)`,
    passengers: String(passengers),
  });

  const chooseDay = (id: DayId) => {
    const next = dayById(id);
    setDayId(id);
    set("from", next.from);
    set("passengers", String(next.passengers));
  };

  const date = formatDate(trip.date);
  const bounds = sheetBounds(sheetFor(day));
  const headline = [
    date ?? "Date to be confirmed",
    `${passengers} ${passengers === 1 ? "passenger" : "passengers"}`,
    `${count > 1 ? `${count} × ` : ""}${vehicle.name}`,
  ].join(" / ");

  return (
    <div
      className={`${styles.page} font-(family-name:--font-text) antialiased`}
    >
      <a
        href="#top"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-(--ink) focus:px-4 focus:py-2 focus:text-(--paper)"
      >
        Skip to the booking
      </a>
      <HourRail day={day} sheetRef={sheetRef} />

      <div ref={sheetRef} className="lg:pl-(--rail)">
        <div className={styles.day} style={{ background: SKY.preDawn }}>
          <header
            className={`${SHEET_GUTTER} flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-b border-(--line) py-5`}
          >
            <p
              className={`${slabFont} text-[22px] font-bold tracking-[-0.01em]`}
            >
              Heavenly Travel
            </p>
            <p
              className={`${label} flex flex-wrap items-baseline gap-x-6 gap-y-1`}
            >
              <span className="text-(--muted)">
                {date ? `Day sheet for ${date}` : "Day sheet, date open"}
              </span>
              <a
                href={WHATSAPP_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className={link}
              >
                WhatsApp
              </a>
            </p>
          </header>
        </div>

        <main id="top">
          <section
            aria-labelledby="book-the-day"
            className={`${styles.day} ${SHEET_GUTTER} pt-14 pb-10 sm:pt-20`}
            style={{ background: skyGradient(DAY_START, bounds.start) }}
          >
            <div data-minutes={DAY_START}>
              <p
                className={`${label} flex flex-wrap items-center gap-x-3 gap-y-2`}
              >
                <span aria-hidden className="h-2.5 w-2.5 bg-(--signal)" />
                <time dateTime={toClock(DAY_START)}>{toClock(DAY_START)}</time>
                <span className="basis-full leading-relaxed text-(--muted) sm:basis-auto">
                  Before dawn, Langkawi. Cars with driver and coach charter, all
                  Malaysia.
                </span>
              </p>
              <h1
                id="book-the-day"
                className={`${slabFont} mt-7 max-w-[13ch] text-[clamp(2.9rem,8.6vw,8rem)] leading-[0.94] font-semibold tracking-[-0.035em]`}
              >
                Book the day, not just the ride.
              </h1>
              <p className="mt-8 max-w-[56ch] text-[19px] leading-[1.6]">
                When you hire a car with a driver, or a coach for forty, what
                you are buying is a day that runs on time. So this page is a
                day. Choose one, then scroll through it from 06:00 to 22:00.
              </p>
            </div>
            <div className="mt-16">
              <DayPicker
                day={day}
                onDayChange={chooseDay}
                trip={trip}
                onTripChange={set}
                vehicle={vehicle}
                vehicleCount={count}
                whatsappHref={whatsappHref}
              />
            </div>
          </section>

          <RunSheet
            key={day.id}
            day={day}
            interludes={interludes}
            headline={headline}
            vehicleInterlude={
              <FleetTable selectedId={vehicle.id} passengers={passengers} />
            }
          />

          <Closing
            from={bounds.end}
            dayTitle={day.title}
            whatsappHref={whatsappHref}
          />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
