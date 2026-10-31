import {
  SITE_PAGE_LABELS,
  SOCIAL_NETWORK_LABELS,
  addressLinesOf,
  changedFooterParts,
  isUploadUrl,
  type FooterContent,
  type FooterLink,
  type PageImage,
} from "@repo/db";
import Image from "next/image";
import {
  ContentPart,
  NONE,
} from "../../../../../_components/page-editor/ContentPart";
import { logoSrc } from "./logo-src";

/** Where a link goes, as the editor names it: "About us", "Location: langkawi", the address. */
function targetName({ target }: FooterLink) {
  switch (target.kind) {
    case "page":
      return SITE_PAGE_LABELS[target.page];
    case "location":
      return `Location: ${target.slug}`;
    case "url":
      return target.url;
  }
}

function Links({ links }: { links: readonly FooterLink[] }) {
  if (links.length === 0) return NONE;
  return (
    <ul className="grid gap-0.5">
      {links.map((link, i) => (
        <li key={i}>
          {link.label || <span className="text-muted">No text</span>}
          <span className="text-muted"> → {targetName(link)}</span>
        </li>
      ))}
    </ul>
  );
}

function Logo({ image, siteUrl }: { image: PageImage; siteUrl: string }) {
  return (
    <Image
      src={logoSrc(siteUrl, image.url)}
      unoptimized={!isUploadUrl(image.url)}
      width={image.width}
      height={image.height}
      alt={image.alt}
      sizes="96px"
      className="h-10 w-auto max-w-24 rounded border border-card-edge bg-white object-contain p-1"
    />
  );
}

/** A heading as the view shows it: in small capitals over its part, or a note that there is none. */
function Heading({ text }: { text: string }) {
  return text ? (
    <span className="text-xs font-semibold tracking-wide text-muted uppercase">
      {text}
    </span>
  ) : (
    <span className="text-xs text-muted">No heading</span>
  );
}

/**
 * The footer, read-only, in the order of its editor: every part in full,
 * to be read and copied back by hand. Beside another footer, each part
 * that differs from it is marked.
 */
export function FooterContentView({
  content,
  comparedTo,
  siteUrl,
}: {
  content: FooterContent;
  comparedTo?: FooterContent;
  /** The customer site, where the logos it ships are. */
  siteUrl: string;
}) {
  const changed = new Set(
    comparedTo ? changedFooterParts(content, comparedTo) : [],
  );
  const address = addressLinesOf(content);
  return (
    <dl className="grid gap-5">
      <ContentPart label="Tagline" changed={changed.has("Tagline")}>
        {content.tagline || NONE}
      </ContentPart>
      <ContentPart label="Link columns" changed={changed.has("Link columns")}>
        {content.columns.length === 0
          ? NONE
          : content.columns.map((column, i) => (
              <div key={i} className="grid gap-1">
                <Heading text={column.heading} />
                <Links links={column.links} />
              </div>
            ))}
      </ContentPart>
      <ContentPart label="Social links" changed={changed.has("Social links")}>
        <Heading text={content.socialHeading} />
        {content.social.length === 0 ? (
          NONE
        ) : (
          <ul className="grid gap-0.5">
            {content.social.map((row, i) => (
              <li key={i}>
                {SOCIAL_NETWORK_LABELS[row.network]}
                <span className="text-muted"> → {row.url}</span>
              </li>
            ))}
          </ul>
        )}
      </ContentPart>
      <ContentPart
        label="Contact details"
        changed={changed.has("Contact details")}
      >
        <Heading text={content.contactHeading} />
        <span>WhatsApp: {content.whatsapp || "None"}</span>
        <span>Phone: {content.phone || "None"}</span>
        <span>Email: {content.email || "None"}</span>
        {address.length > 0 ? (
          <span>
            {address.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </span>
        ) : (
          <span>Address: None</span>
        )}
      </ContentPart>
      <ContentPart label="Registrations" changed={changed.has("Registrations")}>
        <Heading text={content.badgesHeading} />
        {content.badges.length === 0
          ? NONE
          : content.badges.map((badge, i) => (
              <div key={i} className="flex items-center gap-3">
                {badge.image ? (
                  <Logo image={badge.image} siteUrl={siteUrl} />
                ) : null}
                <span>
                  <span className="block font-medium">
                    {badge.name || "No name"}
                  </span>
                  <span className="block text-muted">{badge.detail}</span>
                  {badge.link ? (
                    <span className="block break-all text-muted">
                      Certificate: {badge.link}
                    </span>
                  ) : null}
                </span>
              </div>
            ))}
      </ContentPart>
      <ContentPart label="Payment logos" changed={changed.has("Payment logos")}>
        <Heading text={content.paymentHeading} />
        {content.paymentLogos.length === 0 ? (
          NONE
        ) : (
          <ul className="flex flex-wrap gap-2">
            {content.paymentLogos.map((logo, i) => (
              <li key={i} title={logo.alt}>
                <Logo image={logo} siteUrl={siteUrl} />
              </li>
            ))}
          </ul>
        )}
        {content.paymentNote ? <span>{content.paymentNote}</span> : null}
      </ContentPart>
      <ContentPart
        label="Copyright line"
        changed={changed.has("Copyright line")}
      >
        <span>
          {content.legalName || "No company name"}
          {content.registration ? ` · ${content.registration}` : ""}
        </span>
        <span className="text-muted">From {content.since ?? "this year"}</span>
        <Links links={content.legalLinks} />
      </ContentPart>
    </dl>
  );
}
