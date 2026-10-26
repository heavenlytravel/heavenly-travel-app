import Image from "next/image";
import Link from "next/link";
import {
  addressLinesOf,
  copyrightOf,
  footerLinkHref,
  isExternalFooterLink,
  phoneHrefOf,
  whatsappHrefOf,
  SOCIAL_NETWORK_LABELS,
  type FooterContent,
  type FooterLink,
  type SocialNetwork,
} from "@repo/db";
import { focus } from "../(site)/_components/Page";
import { Photo } from "./Brand";

/**
 * The foot of every page of the customer site, as SUPER writes it in the
 * console: the logo and the tagline; the link columns, "Follow us on" and
 * "Get in touch"; the bodies the company is registered with and the ways
 * to pay; then the copyright line with its links. A part with nothing in
 * it is left out and the others close up. `content` is the footer as it is
 * shown, its links to pages the public cannot open already left out.
 */
export function SiteFooter({ content }: { content: FooterContent }) {
  const year = new Date().getFullYear();
  const whatsappHref = content.whatsapp
    ? whatsappHrefOf(content.whatsapp)
    : null;
  const phoneHref = content.phone ? phoneHrefOf(content.phone) : null;
  const address = addressLinesOf(content);
  const hasContact =
    content.whatsapp !== "" ||
    content.phone !== "" ||
    content.email !== "" ||
    address.length > 0;
  const hasLower = content.badges.length > 0 || content.paymentLogos.length > 0;

  return (
    <footer className="border-t border-slate-200 bg-mist text-[0.95rem] text-slate-700">
      <div className="px-5 py-12 sm:px-[clamp(20px,5vw,78px)] sm:pt-16 sm:pb-12">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_3fr] lg:gap-14">
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
              {content.tagline && (
                <p className="mt-4 leading-relaxed text-slate-500">
                  {content.tagline}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-9 lg:flex lg:justify-between lg:gap-x-10">
              {content.columns.map((column, index) => (
                <nav key={index} aria-labelledby={`footer-column-${index}`}>
                  <Heading id={`footer-column-${index}`}>
                    {column.heading}
                  </Heading>
                  <ul className="grid gap-2.5">
                    {column.links.map((link, i) => (
                      <li key={i}>
                        <FooterAnchor link={link} />
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}

              {content.social.length > 0 && (
                <nav aria-labelledby="footer-social">
                  <Heading id="footer-social">{content.socialHeading}</Heading>
                  <ul className="grid gap-2.5">
                    {content.social.map(({ network, url }, i) => (
                      <li key={i}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-2.5 ${linkClass} [&:hover>svg]:text-brand`}
                        >
                          <SocialGlyph network={network} />
                          {SOCIAL_NETWORK_LABELS[network]}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}

              {hasContact && (
                <div className="col-span-2 sm:col-span-1">
                  <Heading>{content.contactHeading}</Heading>
                  <address className="grid justify-items-start gap-2.5 not-italic">
                    {content.whatsapp &&
                      (whatsappHref ? (
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={linkClass}
                        >
                          WhatsApp us
                        </a>
                      ) : (
                        <span>WhatsApp {content.whatsapp}</span>
                      ))}
                    {content.phone &&
                      (phoneHref ? (
                        <a href={phoneHref} className={linkClass}>
                          {content.phone}
                        </a>
                      ) : (
                        <span>{content.phone}</span>
                      ))}
                    {content.email && (
                      <a href={`mailto:${content.email}`} className={linkClass}>
                        {content.email}
                      </a>
                    )}
                    {address.length > 0 && (
                      <span className="leading-relaxed text-slate-500">
                        {address.map((line, i) => (
                          <span key={i} className="block lg:whitespace-nowrap">
                            {line}
                          </span>
                        ))}
                      </span>
                    )}
                  </address>
                </div>
              )}
            </div>
          </div>

          {hasLower && (
            <div className="mt-11 grid gap-9 border-t border-slate-200 pt-8 lg:grid-cols-[1fr_1.5fr] lg:items-start lg:gap-16">
              {content.badges.length > 0 && (
                <section aria-labelledby="footer-badges">
                  <Heading id="footer-badges">{content.badgesHeading}</Heading>
                  <ul className="flex flex-wrap gap-x-7 gap-y-4">
                    {content.badges.map((badge, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-3 text-[0.875rem] text-slate-600"
                      >
                        {badge.image && (
                          <Image
                            src={badge.image.url}
                            width={badge.image.width}
                            height={badge.image.height}
                            alt=""
                            sizes="120px"
                            className="h-12 w-auto max-w-[120px] object-contain"
                          />
                        )}
                        <span>
                          <strong className="block text-[0.95rem] text-ink">
                            {badge.name}
                          </strong>
                          {badge.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {content.paymentLogos.length > 0 && (
                <section
                  aria-labelledby="footer-payment"
                  className="lg:col-start-2"
                >
                  <Heading id="footer-payment">
                    {content.paymentHeading}
                  </Heading>
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {content.paymentLogos.map((logo, i) => (
                      <li
                        key={i}
                        className="grid h-14 place-items-center rounded-[10px] border border-slate-200 bg-white px-2"
                      >
                        <Image
                          src={logo.url}
                          width={logo.width}
                          height={logo.height}
                          alt={logo.alt}
                          sizes="96px"
                          className="max-h-9 w-auto max-w-full object-contain"
                        />
                      </li>
                    ))}
                  </ul>
                  {content.paymentNote && (
                    <p className="mt-3 flex items-center gap-1.5 text-[0.875rem] text-slate-500">
                      <LockGlyph />
                      {content.paymentNote}
                    </p>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 px-5 py-[18px] text-[0.875rem] text-slate-500 sm:px-[clamp(20px,5vw,78px)]">
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <p>
            {copyrightOf(content, year)}
            {content.registration && ` · ${content.registration}`}
          </p>
          {content.legalLinks.length > 0 && (
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
              {content.legalLinks.map((link, i) => (
                <li key={i}>
                  <FooterAnchor link={link} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}

const linkClass = `underline-offset-4 hover:text-brand hover:underline ${focus}`;

/** A heading over a part of the footer; `id` names the part for a screen reader. */
function Heading({ id, children }: { id?: string; children: string }) {
  return (
    <h2
      id={id}
      className="mb-4 text-[0.8rem] font-bold tracking-[0.18em] text-slate-500 uppercase lg:whitespace-nowrap"
    >
      {children}
    </h2>
  );
}

/** A link of the footer: on the site by `Link`, elsewhere in a new tab. */
function FooterAnchor({ link }: { link: FooterLink }) {
  const href = footerLinkHref(link.target);
  if (isExternalFooterLink(link.target)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {link.label}
      </a>
    );
  }
  if (link.target.kind === "url" && !href.startsWith("/")) {
    // An email or a phone link.
    return (
      <a href={href} className={linkClass}>
        {link.label}
      </a>
    );
  }
  return (
    <Link href={href} className={linkClass}>
      {link.label}
    </Link>
  );
}

const glyph = {
  viewBox: "0 0 24 24",
  width: 18,
  height: 18,
  "aria-hidden": true,
  className: "shrink-0 text-navy",
} as const;

/** The mark of a social network, in the link's colour. */
function SocialGlyph({ network }: { network: SocialNetwork }) {
  switch (network) {
    case "facebook":
      return (
        <svg {...glyph} fill="currentColor">
          <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...glyph} fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "x":
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
    case "tiktok":
      return (
        <svg {...glyph} fill="currentColor">
          <path d="M14.5 3h2.7c.3 2 1.6 3.5 3.8 3.7v2.8c-1.4 0-2.7-.4-3.8-1.1v6.3a5.6 5.6 0 1 1-5.6-5.6h.6v2.9a2.8 2.8 0 1 0 2.3 2.7z" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...glyph} fill="currentColor">
          <path d="M21.6 7.2c-.2-.9-.9-1.6-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8c.2.9.9 1.6 1.8 1.8 1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...glyph} fill="currentColor">
          <path d="M4.5 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM3 9h3v12H3zm6 0h2.9v1.6h.1c.4-.8 1.4-1.8 3-1.8 3.2 0 3.8 2.1 3.8 4.8V21h-3v-6.6c0-1.6 0-3.6-2.2-3.6s-2.6 1.7-2.6 3.5V21H9z" />
        </svg>
      );
  }
}

function LockGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={15}
      height={15}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
