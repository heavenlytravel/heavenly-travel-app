import Link from "next/link";
import { COMPANY, CONTACT, locationPagePath } from "@repo/db";
import { Photo } from "../_components/Brand";
import { SEARCH_CARD_ID } from "../_lib/search";
import { ServiceTabsSearch } from "../_components/search/ServiceTabsSearch";

/**
 * Sections of the home page that need no state of their own, and the
 * closing call and the footer every marketing page ends with.
 */

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-azure";

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
      className="relative z-[3] mx-auto mt-auto mb-8 w-[calc(100%-24px)] max-w-[1240px] scroll-mt-24 sm:mb-14 sm:w-[88%]"
    >
      <ServiceTabsSearch />
    </div>
  );
}

/**
 * The closing call: one line, then the two ways to start. "Get my price"
 * goes to the search card, `priceHref`: on the page where it has one,
 * else to the page that does; "WhatsApp us" opens a chat with ops.
 */
export function Closing({ priceHref }: { priceHref: string }) {
  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="mx-3 mb-[35px] flex scroll-mt-8 flex-col items-start justify-between gap-[30px] rounded-[22px] bg-navy px-6 py-9 text-white sm:mx-[clamp(20px,5vw,78px)] sm:mb-[60px] sm:px-[clamp(24px,5vw,70px)] sm:py-[52px] lg:flex-row lg:items-center"
    >
      <div>
        <p className={`${eyebrow} !text-azure-light`}>
          Local knowledge, one team
        </p>
        <h2
          id="contact-title"
          className="my-2 font-(family-name:--font-display) text-[clamp(2.2rem,4vw,4rem)] leading-[1.05]"
        >
          Tell us where you want to go.
        </h2>
      </div>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <a
          href={priceHref}
          className={`rounded-full bg-white px-6 py-[15px] text-center font-bold whitespace-nowrap text-brand hover:bg-brand-tint ${focus}`}
        >
          Get my price <span className="ml-3">→</span>
        </a>
        <a
          href={CONTACT.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`rounded-full border border-white/40 px-6 py-[15px] text-center font-bold whitespace-nowrap text-white hover:border-white hover:bg-white/10 ${focus}`}
        >
          WhatsApp us <span className="ml-3">↗</span>
        </a>
      </div>
    </section>
  );
}

/** A link in one of the footer's columns. */
export type FooterLink = { href: string; label: string };

const footerHeading =
  "mb-4 text-[0.72rem] font-bold tracking-[0.22em] text-slate-500 uppercase";

const footerLink = `text-slate-700 underline-offset-4 hover:text-brand hover:underline ${focus}`;

/**
 * The foot of every marketing page: the company in a line with its social
 * links on the left; on the right the destinations on the home page, the
 * company's own pages that are published, and how to reach the office;
 * then the legal name and the registration, centred. A column with nothing
 * in it is left out, and the others close up to the right. The details are
 * `COMPANY`'s and `CONTACT`'s.
 */
export function SiteFooter({
  destinations,
  links,
}: {
  /** The home page's top choices, by slug and name. */
  destinations: readonly { slug: string; name: string }[];
  /** The company's pages that are published: about us, the legal pages. */
  links: readonly FooterLink[];
}) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 bg-white text-[0.95rem]">
      <div className="px-5 py-12 sm:px-[clamp(20px,5vw,78px)] sm:py-16">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-10 lg:flex-row lg:justify-between lg:gap-16">
          <div className="max-w-[340px]">
            <Link
              href="/"
              aria-label="Heavenly Travel home"
              className={`inline-block ${focus}`}
            >
              <Photo
                src="/brand/logo-blue.svg"
                alt="Heavenly, your travel engineer"
                className="h-10 w-auto"
              />
            </Link>
            <p className="mt-4 leading-relaxed text-slate-500">
              Cars with drivers, coaches and whole trips across Malaysia,
              planned by a team based in Langkawi.
            </p>
            <ul aria-label="Follow us" className="mt-5 flex gap-2.5">
              {SOCIAL.map(({ key, label, Glyph }) => (
                <li key={key}>
                  <a
                    href={COMPANY.social[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Heavenly Travel on ${label}`}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-navy hover:border-brand hover:bg-brand-tint hover:text-brand ${focus}`}
                  >
                    <Glyph />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:flex lg:gap-x-20">
            {destinations.length > 0 && (
              <nav aria-labelledby="footer-destinations">
                <h2 id="footer-destinations" className={footerHeading}>
                  Destinations
                </h2>
                <ul className="grid gap-2.5">
                  {destinations.map((destination) => (
                    <li key={destination.slug}>
                      <Link
                        href={locationPagePath(destination.slug)}
                        className={footerLink}
                      >
                        {destination.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            {links.length > 0 && (
              <nav aria-labelledby="footer-company">
                <h2 id="footer-company" className={footerHeading}>
                  Company
                </h2>
                <ul className="grid gap-2.5">
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={footerLink}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            <div>
              <h2 className={footerHeading}>Get in touch</h2>
              <address className="grid justify-items-start gap-2.5 text-slate-700 not-italic">
                <span className="leading-relaxed">
                  {COMPANY.address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </span>
                <a href={COMPANY.phoneHref} className={footerLink}>
                  {COMPANY.phone}
                </a>
                <a href={`mailto:${COMPANY.email}`} className={footerLink}>
                  {COMPANY.email}
                </a>
                <a
                  href={CONTACT.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={footerLink}
                >
                  WhatsApp us
                </a>
              </address>
            </div>
          </div>
        </div>
      </div>
      <p className="bg-ink px-5 py-4 text-center text-[0.8rem] text-white/75 sm:px-[clamp(20px,5vw,78px)]">
        © {COMPANY.since}–{year} {COMPANY.legalName} · {COMPANY.registration}
      </p>
    </footer>
  );
}

const glyph = {
  viewBox: "0 0 24 24",
  width: 18,
  height: 18,
  "aria-hidden": true,
} as const;

function FacebookGlyph() {
  return (
    <svg {...glyph} fill="currentColor">
      <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21z" />
    </svg>
  );
}

function InstagramGlyph() {
  return (
    <svg {...glyph} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XGlyph() {
  return (
    <svg {...glyph} fill="currentColor">
      <path d="M4.5 4h4.2l10.8 16h-4.2z" />
      <path
        d="M19 4.2 5 19.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The social links, in the footer's order, each with its glyph. */
const SOCIAL = [
  { key: "facebook", label: "Facebook", Glyph: FacebookGlyph },
  { key: "instagram", label: "Instagram", Glyph: InstagramGlyph },
  { key: "x", label: "X", Glyph: XGlyph },
] as const;
