import {
  SITE_PAGE_LABELS,
  SOCIAL_NETWORK_LABELS,
  addressLinesOf,
  changedFooterParts,
  type FooterContent,
  type FooterLink,
  type PageImage,
} from "@repo/db";
import { Badge } from "@repo/ui/badge";
import Image from "next/image";
import type { ReactNode } from "react";

function Part({
  label,
  changed,
  children,
}: {
  label: string;
  changed: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-2 text-xs font-medium text-slate-500">
        {label}
        {changed ? <Badge tone="amber">Changed</Badge> : null}
      </dt>
      <dd className="mt-1 grid gap-1 text-sm text-slate-900">{children}</dd>
    </div>
  );
}

const NONE = <span className="text-slate-400">None</span>;

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
          {link.label || <span className="text-slate-400">No text</span>}
          <span className="text-slate-500"> → {targetName(link)}</span>
        </li>
      ))}
    </ul>
  );
}

function Logo({ image }: { image: PageImage }) {
  return (
    <Image
      src={image.url}
      width={image.width}
      height={image.height}
      alt={image.alt}
      sizes="96px"
      className="h-10 w-auto max-w-24 rounded border border-slate-200 bg-white object-contain p-1"
    />
  );
}

/** A heading as the view shows it: in small capitals over its part, or a note that there is none. */
function Heading({ text }: { text: string }) {
  return text ? (
    <span className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
      {text}
    </span>
  ) : (
    <span className="text-xs text-slate-400">No heading</span>
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
}: {
  content: FooterContent;
  comparedTo?: FooterContent;
}) {
  const changed = new Set(
    comparedTo ? changedFooterParts(content, comparedTo) : [],
  );
  const address = addressLinesOf(content);
  return (
    <dl className="grid gap-5">
      <Part label="Tagline" changed={changed.has("Tagline")}>
        {content.tagline || NONE}
      </Part>
      <Part label="Link columns" changed={changed.has("Link columns")}>
        {content.columns.length === 0
          ? NONE
          : content.columns.map((column, i) => (
              <div key={i} className="grid gap-1">
                <Heading text={column.heading} />
                <Links links={column.links} />
              </div>
            ))}
      </Part>
      <Part label="Social links" changed={changed.has("Social links")}>
        <Heading text={content.socialHeading} />
        {content.social.length === 0 ? (
          NONE
        ) : (
          <ul className="grid gap-0.5">
            {content.social.map((row, i) => (
              <li key={i}>
                {SOCIAL_NETWORK_LABELS[row.network]}
                <span className="text-slate-500"> → {row.url}</span>
              </li>
            ))}
          </ul>
        )}
      </Part>
      <Part label="Contact details" changed={changed.has("Contact details")}>
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
      </Part>
      <Part label="Registrations" changed={changed.has("Registrations")}>
        <Heading text={content.badgesHeading} />
        {content.badges.length === 0
          ? NONE
          : content.badges.map((badge, i) => (
              <div key={i} className="flex items-center gap-3">
                {badge.image ? <Logo image={badge.image} /> : null}
                <span>
                  <span className="block font-medium">
                    {badge.name || "No name"}
                  </span>
                  <span className="text-slate-600">{badge.detail}</span>
                </span>
              </div>
            ))}
      </Part>
      <Part label="Payment logos" changed={changed.has("Payment logos")}>
        <Heading text={content.paymentHeading} />
        {content.paymentLogos.length === 0 ? (
          NONE
        ) : (
          <ul className="flex flex-wrap gap-2">
            {content.paymentLogos.map((logo, i) => (
              <li key={i} title={logo.alt}>
                <Logo image={logo} />
              </li>
            ))}
          </ul>
        )}
        {content.paymentNote ? <span>{content.paymentNote}</span> : null}
      </Part>
      <Part label="Copyright line" changed={changed.has("Copyright line")}>
        <span>
          {content.legalName || "No company name"}
          {content.registration ? ` · ${content.registration}` : ""}
        </span>
        <span className="text-slate-600">
          From {content.since ?? "this year"}
        </span>
        <Links links={content.legalLinks} />
      </Part>
    </dl>
  );
}
