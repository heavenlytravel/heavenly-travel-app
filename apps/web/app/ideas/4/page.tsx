/**
 * The day, by the hour
 * Route: /ideas/4
 * Model: Claude Fable 5.1 (claude-fable-5-1)
 * Direction: You book a day, and the page is that day. Scrolling is time
 * passing from 06:00 to 22:00: an hour rail with a now-marker, a run sheet of
 * timed stops, the sky changing behind it, and the company's story told at
 * the hour it matters instead of in the usual sections.
 * Generated: 2026-09-17
 */

import type { Metadata } from "next";
import { Day } from "./_components/Day";
import {
  DriverInterlude,
  IncludedInterlude,
  ServicesInterlude,
} from "./_components/Interludes";
import { fontVars } from "./_lib/fonts";

export const metadata: Metadata = {
  title: "The day, by the hour | Heavenly Travel ideas",
  description:
    "Book a day, not just a ride. Cars with driver and coach charter across Malaysia, laid out hour by hour from 06:00 to 22:00. Based in Langkawi.",
};

export default function Page() {
  return (
    <div className={fontVars}>
      <Day
        interludes={{
          driver: <DriverInterlude />,
          included: <IncludedInterlude />,
          services: <ServicesInterlude />,
        }}
      />
    </div>
  );
}
