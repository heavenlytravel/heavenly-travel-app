import { WHATSAPP_HREF } from "../_lib/content";
import { BookingSearch } from "./DestinationPicker";

/** Sections of the home page that need no state of their own. */

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#caa243]";

export const eyebrow =
  "text-[0.76rem] font-bold tracking-[0.25em] text-[#073c36] uppercase";

const TRUST = [
  {
    icon: "✓",
    title: "Trusted local team",
    text: "Quality you can rely on",
  },
  { icon: "◇", title: "Clear, fair pricing", text: "No surprise charges" },
  {
    icon: "◉",
    title: "Support when needed",
    text: "Real people, ready to help",
  },
];

/** Why book with us: a quiet strip between the hero and the destinations. */
export function Trust() {
  return (
    <section
      id="why-us"
      aria-label="Why Heavenly"
      className="scroll-mt-8 border-b border-[#e6ebe9] px-5 py-7 sm:px-[clamp(20px,5vw,78px)] sm:py-9"
    >
      <ul className="mx-auto grid max-w-[1240px] sm:grid-cols-3">
        {TRUST.map((t) => (
          <li
            key={t.title}
            className="flex gap-[13px] border-b border-[#dce3e0] px-[5px] py-[11px] last:border-0 sm:justify-center sm:border-r sm:border-b-0 sm:px-[22px] sm:py-0"
          >
            <span aria-hidden className="text-[1.65rem] text-[#073c36]">
              {t.icon}
            </span>
            <p>
              <strong className="block">{t.title}</strong>
              <small className="mt-0.5 block text-[0.83rem] text-[#67726f]">
                {t.text}
              </small>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The booking card, resting on the floor of the hero. */
export function Booking() {
  return (
    // The hero is a full-height column; mt-auto rests the card on its floor.
    <div
      id="booking"
      role="search"
      aria-label="Travel booking search"
      className="relative z-[3] mx-auto mt-auto mb-8 w-[calc(100%-24px)] max-w-[1240px] scroll-mt-24 sm:mb-14 sm:w-[88%]"
    >
      <BookingSearch />
    </div>
  );
}

export function Closing() {
  return (
    <section
      id="contact"
      className="mx-3 mb-[35px] flex scroll-mt-8 flex-col items-start justify-between gap-[30px] rounded-[22px] bg-[#073c36] px-6 py-9 text-white sm:mx-[clamp(20px,5vw,78px)] sm:mb-[60px] sm:flex-row sm:items-center sm:px-[clamp(24px,5vw,70px)] sm:py-[52px]"
    >
      <div>
        <p className={`${eyebrow} !text-[#c7ded8]`}>
          Local knowledge, one team
        </p>
        <h2 className="my-2 font-(family-name:--font-display) text-[clamp(2.2rem,4vw,4rem)] leading-[1.05]">
          Tell us where you want to go.
        </h2>
      </div>
      <a
        href={WHATSAPP_HREF}
        target="_blank"
        rel="noopener noreferrer"
        className={`w-full rounded-full bg-white px-5 py-[15px] text-center font-bold whitespace-nowrap text-[#073c36] hover:bg-[#e8f2ef] sm:w-auto ${focus}`}
      >
        Start planning <span className="ml-4">↗</span>
      </a>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="flex flex-col justify-between gap-3 px-5 pb-7 text-[0.82rem] text-[#64716e] sm:flex-row sm:px-[clamp(20px,5vw,78px)] sm:pb-[35px]">
      <span>© {new Date().getFullYear()} Heavenly Travel</span>
      <span>Inbound · Outbound · Ticketing · Transportation</span>
    </footer>
  );
}
