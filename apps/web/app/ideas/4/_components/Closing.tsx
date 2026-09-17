import Image from "next/image";
import { BADGES, PHONE, STEPS, WHATSAPP_HREF } from "../../../_lib/content";
import { WhatsAppIcon } from "../../../_components/WhatsAppIcon";
import styles from "../page.module.css";
import { DAY_END, SKY, skyGradient, toClock } from "../_lib/sky";
import { label, link, monoFont, primaryButton, slabFont } from "../_lib/ui";
import { SHEET_GUTTER } from "./RunSheet";

/** When each of the four STEPS tends to happen, counted from 22:00 tonight. */
const STEP_TIMES = ["22:00", "22:10", "22:15", "On the day"] as const;

/** 22:00. The day is over; the only question left is the next one. */
export function Closing({
  from,
  dayTitle,
  whatsappHref,
}: {
  /** Minutes at which this block's sky begins. */
  from: number;
  dayTitle: string;
  whatsappHref: string;
}) {
  const clock = toClock(DAY_END);
  return (
    <div
      className={`${styles.night} ${SHEET_GUTTER} pb-24`}
      style={{ background: skyGradient(from, DAY_END) }}
    >
      <section
        aria-labelledby="tomorrow"
        className="pt-[clamp(8rem,18vw,15rem)]"
      >
        <div
          data-minutes={DAY_END}
          className="grid gap-x-10 gap-y-3 md:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]"
        >
          <time
            dateTime={clock}
            className={`${slabFont} block text-[clamp(4rem,9.5vw,8.25rem)] leading-[0.86] font-light tracking-[-0.045em] tabular-nums`}
          >
            {clock}
          </time>
          <div className="border-t-2 border-(--fg) pt-4">
            <h2
              id="tomorrow"
              className={`${slabFont} text-[clamp(3rem,8vw,7rem)] leading-[0.95] font-semibold tracking-[-0.03em]`}
            >
              Tomorrow?
            </h2>
            <p className="mt-6 max-w-[50ch] text-[18px] leading-[1.6]">
              That was the {dayTitle.toLowerCase()}. Yours will have different
              stops and the same habit of running on time. Send it to us as it
              stands and we will fix the details in the chat.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className={primaryButton}
              >
                <WhatsAppIcon />
                Book this day on WhatsApp
              </a>
              <a href="#top" className={`${link} text-[16px]`}>
                Back to 06:00, pick another day
              </a>
            </div>
            <p className="mt-4 text-[14px] text-(--muted)">
              Prices are indicative. A quote confirms.
            </p>
          </div>
        </div>

        <ol className="mt-20 max-w-4xl border-t-2 border-(--fg)">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="grid gap-x-6 gap-y-1 border-b border-(--line) py-4 sm:grid-cols-[8rem_minmax(0,15rem)_1fr]"
            >
              <span className={`${monoFont} text-[14px] text-(--muted)`}>
                {STEP_TIMES[i]}
              </span>
              <h3
                className={`${slabFont} text-[19px] leading-tight font-semibold`}
              >
                {step.title}
              </h3>
              <p className="text-[16px] leading-normal">{step.text}</p>
            </li>
          ))}
        </ol>
        <p className={`${label} mt-4 text-(--muted)`}>
          How it usually goes on WhatsApp. Not a promise at this hour.
        </p>
      </section>
    </div>
  );
}

/** Contact and registrations, on the last of the night sky. */
export function SiteFooter() {
  return (
    <footer
      className={`${styles.night} ${SHEET_GUTTER} pb-28`}
      style={{ background: SKY.night }}
    >
      <div className="grid gap-10 border-t border-(--line) pt-8 md:grid-cols-[1fr_auto]">
        <div>
          <p className={`${slabFont} text-[22px] font-bold tracking-[-0.01em]`}>
            Heavenly Travel
          </p>
          <p className="mt-2 max-w-[44ch] text-[16px] leading-normal text-(--muted)">
            Cars with driver and coach charter. Based in Langkawi, Kedah,
            serving all of Malaysia.
          </p>
          <p
            className={`${monoFont} mt-5 flex flex-wrap gap-x-8 gap-y-2 text-[15px]`}
          >
            <a href={`tel:${PHONE.replace(/\s/g, "")}`} className={link}>
              {PHONE}
            </a>
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className={link}
            >
              WhatsApp, any hour
            </a>
          </p>
        </div>
        <ul className="flex items-start gap-6">
          {BADGES.map((b) => (
            <li key={b.label} className="w-24">
              <Image
                src={b.image}
                alt={b.alt}
                width={280}
                height={230}
                className="h-auto w-full"
              />
              <span
                className={`${label} mt-2 block text-[11px] text-(--muted)`}
              >
                {b.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
