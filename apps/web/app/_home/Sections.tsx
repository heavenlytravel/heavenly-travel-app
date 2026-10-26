import { SEARCH_CARD_ID } from "../_lib/search";
import { ServiceTabsSearch } from "../_components/search/ServiceTabsSearch";

/** Sections of the home page that need no state of their own. */

export const eyebrow =
  "text-[0.76rem] font-bold tracking-[0.25em] text-brand uppercase";

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
      className="scroll-mt-8 border-b border-slate-200 px-5 py-7 sm:px-[clamp(20px,5vw,78px)] sm:py-9"
    >
      <ul className="mx-auto grid max-w-[1240px] sm:grid-cols-3">
        {TRUST.map((t) => (
          <li
            key={t.title}
            className="flex gap-[13px] border-b border-slate-200 px-[5px] py-[11px] last:border-0 sm:justify-center sm:border-r sm:border-b-0 sm:px-[22px] sm:py-0"
          >
            <span aria-hidden className="text-[1.65rem] text-brand">
              {t.icon}
            </span>
            <p>
              <strong className="block">{t.title}</strong>
              <small className="mt-0.5 block text-[0.83rem] text-slate-500">
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
      id={SEARCH_CARD_ID}
      role="search"
      aria-label="Travel booking search"
      className="relative z-[3] mx-auto mt-auto mb-8 w-[calc(100%-24px)] max-w-[1240px] sm:mb-14 sm:w-[88%]"
    >
      <ServiceTabsSearch />
    </div>
  );
}
