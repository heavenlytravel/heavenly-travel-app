import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  addressLinesOf,
  copyrightOf,
  footerLinkHref,
  isExternalFooterLink,
  isFooterUrl,
  isUploadUrl,
  phoneHrefOf,
  whatsappHrefOf,
  SOCIAL_NETWORK_LABELS,
  type FooterBadge,
  type FooterContent,
  type FooterLink,
  type SocialNetwork,
} from "@repo/db";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  LockIcon,
  TikTokIcon,
  XLogoIcon,
  YouTubeIcon,
} from "@repo/ui/icons";

/**
 * The foot of every page of the customer site, and of Connect's public
 * pages, as SUPER writes it in the console: the logo and the tagline; the link columns, "Follow us on" and
 * "Get in touch"; the ways to pay and the bodies the company is
 * registered with; then the copyright line with its links. A part with nothing in
 * it is left out and the others close up. `content` is the footer as it is
 * shown, its links to pages the public cannot open already left out. It
 * sits on the site's navy, its words in white, its headings light blue.
 * `logo` is the app's own way home, drawn white. On Connect, `siteUrl` is
 * the customer site's address: a link to one of its pages, and a mark it
 * ships, are made absolute to it; on the customer site it is empty.
 */
export function SiteFooter({
  content,
  logo,
  siteUrl = "",
}: {
  content: FooterContent;
  logo: ReactNode;
  siteUrl?: string;
}) {
  /** An address on the customer site, a mark it ships or a path, from wherever the footer is. */
  const shipped = (url: string) =>
    siteUrl && url.startsWith("/") ? `${siteUrl}${url}` : url;
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
    <footer className="bg-navy text-copy text-white">
      <div className="px-5 py-10 sm:px-[clamp(20px,5vw,78px)] sm:pt-12 sm:pb-10">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_3fr] lg:gap-14">
            <div className="max-w-[340px]">
              {logo}
              {content.tagline && (
                <p className="mt-4 leading-relaxed text-white/90">
                  {content.tagline}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:flex lg:justify-between lg:gap-x-10">
              {content.columns.map((column, index) => (
                <nav key={index} aria-labelledby={`footer-column-${index}`}>
                  <Heading id={`footer-column-${index}`}>
                    {column.heading}
                  </Heading>
                  <ul className="grid gap-2">
                    {column.links.map((link, i) => (
                      <li key={i}>
                        <FooterAnchor link={link} siteUrl={siteUrl} />
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}

              {content.social.length > 0 && (
                <nav aria-labelledby="footer-social">
                  <Heading id="footer-social">{content.socialHeading}</Heading>
                  <ul className="grid gap-2">
                    {content.social.map(({ network, url }, i) => (
                      <li key={i}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-2.5 ${linkClass}`}
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
                  <address className="grid justify-items-start gap-2 not-italic">
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
                      <span className="leading-relaxed text-white/90">
                        {address.map((line, i) => (
                          <span key={i} className="block">
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
            <div className="mt-8 grid gap-8 border-t border-white/25 pt-7 lg:grid-cols-2 lg:items-start lg:gap-16">
              {content.paymentLogos.length > 0 && (
                <section aria-labelledby="footer-payment">
                  <Heading id="footer-payment">
                    {content.paymentHeading}
                  </Heading>
                  {/* Fixed squares, four to a row at most, as the registrations' marks keep their size. */}
                  <ul className="grid w-fit grid-cols-4 gap-2">
                    {content.paymentLogos.map((logo, i) => (
                      <li
                        key={i}
                        className="grid size-14 place-items-center rounded-lg bg-white p-1.5"
                      >
                        <Image
                          src={shipped(logo.url)}
                          width={logo.width}
                          height={logo.height}
                          alt={logo.alt}
                          sizes="96px"
                          // A mark the site ships is served as it is.
                          unoptimized={!isUploadUrl(logo.url)}
                          className="size-full object-contain"
                        />
                      </li>
                    ))}
                  </ul>
                  {content.paymentNote && (
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-white/90">
                      <LockIcon className="size-3.75" />
                      {content.paymentNote}
                    </p>
                  )}
                </section>
              )}
              {content.badges.length > 0 && (
                <section aria-labelledby="footer-badges">
                  <Heading id="footer-badges">{content.badgesHeading}</Heading>
                  {/* A row of marks, each over its name, as the WordPress site had them. */}
                  <ul className="grid grid-cols-3 gap-x-4 gap-y-5">
                    {content.badges.map((badge, i) => (
                      <li key={i}>
                        <BadgeTile badge={badge} onSite={shipped} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/25 px-5 py-[18px] text-sm text-white/90 sm:px-[clamp(20px,5vw,78px)]">
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <p>
            {copyrightOf(content, year)}
            {content.registration && ` · ${content.registration}`}
          </p>
          {content.legalLinks.length > 0 && (
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
              {content.legalLinks.map((link, i) => (
                <li key={i}>
                  <FooterAnchor link={link} siteUrl={siteUrl} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}

/**
 * A link of the footer; on a touch screen its hit area grows to a finger's,
 * without moving the lines. Its focus ring is white: it shows on the navy as
 * the site's blue ring would not.
 */
const linkClass =
  "touch-target text-white underline-offset-4 hover:underline focus-ring focus-ring-dark";

/** A heading over a part of the footer; `id` names the part for a screen reader. */
function Heading({ id, children }: { id?: string; children: string }) {
  return (
    <h2
      id={id}
      className="mb-4 text-caption font-bold tracking-eyebrow text-azure-light uppercase lg:whitespace-nowrap"
    >
      {children}
    </h2>
  );
}

const badgeClass =
  "flex flex-col items-center gap-2 text-center text-sm text-white/90";

/**
 * A body the company is registered with: its mark over its name and its
 * registration number. With a certificate link, the whole of it opens the
 * certificate in a new tab, the number underlined as a link.
 */
function BadgeTile({
  badge,
  onSite,
}: {
  badge: FooterBadge;
  /** An address on the customer site, from wherever the footer is. */
  onSite: (url: string) => string;
}) {
  // A draft's preview shows a link before it is checked: only a sound one opens.
  const href = isFooterUrl(badge.link) ? onSite(badge.link) : null;
  const body = (
    <>
      {badge.image && (
        <Image
          src={onSite(badge.image.url)}
          width={badge.image.width}
          height={badge.image.height}
          alt=""
          sizes="120px"
          unoptimized={!isUploadUrl(badge.image.url)}
          className="h-14 w-auto max-w-full rounded-lg bg-white object-contain p-1"
        />
      )}
      <span>
        <strong className="block text-copy leading-snug text-white">
          {badge.name}
        </strong>
        {href ? (
          <span className="underline underline-offset-4 group-hover:text-white">
            {badge.detail || "View certificate"}
          </span>
        ) : (
          badge.detail
        )}
      </span>
    </>
  );
  if (!href) return <div className={badgeClass}>{body}</div>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group rounded-lg focus-ring focus-ring-dark ${badgeClass}`}
    >
      {body}
      <span className="sr-only">, certificate, opens in a new tab</span>
    </a>
  );
}

/** A link of the footer: on the site by `Link`, elsewhere in a new tab. */
function FooterAnchor({
  link,
  siteUrl,
}: {
  link: FooterLink;
  siteUrl: string;
}) {
  const href = footerLinkHref(link.target);
  if (siteUrl && href.startsWith("/")) {
    // A page of the customer site, from Connect.
    return (
      <a href={`${siteUrl}${href}`} className={linkClass}>
        {link.label}
      </a>
    );
  }
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

/** Each network's mark, drawn in the link's colour. */
const SOCIAL_ICONS = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  x: XLogoIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  linkedin: LinkedInIcon,
} satisfies Record<SocialNetwork, unknown>;

/** The mark of a social network, 18px, in the link's colour. */
function SocialGlyph({ network }: { network: SocialNetwork }) {
  const Icon = SOCIAL_ICONS[network];
  return <Icon className="size-4.5" />;
}
