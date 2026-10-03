import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  LOCATION_PAGE_LABELS,
  formatMyr,
  isProductPage,
  locationPagePath,
  locationPreviewPath,
  paragraphsOf,
  productPagesOf,
  seatsLabel,
  type LocationView,
  type LocationViewPage,
  type PageFaq,
  type PageHighlight,
  type TripCategory,
} from "@repo/db/server";
import { eyebrow, focus, panel } from "../(site)/_components/Page";
import { ProductIcon } from "../_components/Brand";
import { SEARCH_CARD_ID } from "../_components/search/SearchProvider";
import { ServiceTabsSearch } from "../_components/search/ServiceTabsSearch";
import styles from "../_home/home.module.css";
import { vehicleClassCards } from "../_lib/locations";
import { PRODUCTS } from "../_lib/search";
import { TakeMeHere } from "./LocationSearch";
import { crumbsOf, structuredDataOf, type Crumb } from "./seo";

/**
 * One page of a location: its landing page or a product's. Every page has
 * the same layout in the same order, and only the content differs: the hero
 * with the search card on its floor, then on the landing page the products,
 * the intro, the highlights and the FAQs, and on a product page its vehicle
 * classes, the intro and the FAQs. The public pages and the staff preview
 * both render this; `preview` only keeps the links inside the preview. A
 * part with nothing in it is left out, so a half-written draft still reads.
 */

const gutter = "px-5 sm:px-[clamp(20px,5vw,78px)]";
const column = "mx-auto w-full max-w-[1240px]";
const heading =
  "font-(family-name:--font-display) text-[clamp(2rem,3.6vw,3rem)] leading-[1.05] text-[#082f2b]";

export async function LocationPageView({
  location,
  page,
  preview = false,
}: {
  location: LocationView;
  page: LocationViewPage;
  preview?: boolean;
}) {
  const { content } = page;
  const product = isProductPage(page) ? page.page : null;
  const paused = location.state === "paused";
  const pathOf = preview ? locationPreviewPath : locationPagePath;
  const label = product ? LOCATION_PAGE_LABELS[product] : location.name;
  const products = productPagesOf(location);

  return (
    <>
      {structuredDataOf(location, page).map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          // "<" is escaped so no text Marketing wrote can close the script.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(data).replace(/</g, "\\u003c"),
          }}
        />
      ))}

      <section
        aria-labelledby="hero-title"
        className="relative flex flex-col lg:min-h-[620px]"
      >
        {/* Below lg the stacked card outgrows the photo, so the photo stops
            at a fixed height and the card rests across its lower edge. */}
        <div className="absolute inset-x-0 top-0 h-[460px] overflow-hidden bg-[#dce9ec] lg:h-full">
          {content.heroImage && (
            <Image
              src={content.heroImage.url}
              alt={content.heroImage.alt}
              fill
              preload
              sizes="100vw"
              className="object-cover"
            />
          )}
          <div className={`${styles.heroWash} absolute inset-0`} />
        </div>
        <div
          className={`relative z-[1] flex min-h-[340px] flex-1 flex-col justify-center pt-7 pb-8 ${gutter}`}
        >
          <div className={column}>
            <Crumbs crumbs={crumbsOf(location, page, preview)} />
            <p className={`${eyebrow} mt-7 mb-3`}>
              {product
                ? `${label} · ${location.name}`
                : (location.tagline ?? "Destination")}
            </p>
            <h1
              id="hero-title"
              className="max-w-[18ch] font-(family-name:--font-display) text-[clamp(2.5rem,6vw,4.6rem)] leading-[0.98] text-[#082c29]"
            >
              {content.heroHeadline || label}
            </h1>
            {content.heroSubheadline && (
              <p className="mt-4 max-w-[540px] text-[#334744] sm:text-[1.14rem]">
                {content.heroSubheadline}
              </p>
            )}
          </div>
        </div>
        <div
          id={SEARCH_CARD_ID}
          role="search"
          aria-label="Travel booking search"
          className="relative z-[3] mx-auto mb-2 w-[calc(100%-24px)] max-w-[1240px] scroll-mt-24 sm:w-[88%] lg:mb-12"
        >
          {paused ? (
            <PausedNotice name={location.name} />
          ) : (
            <ServiceTabsSearch />
          )}
        </div>
      </section>

      {product ? (
        <>
          <VehicleClasses category={product} />
          {/* Not the product and the place again: the headline has said that. */}
          <Intro
            title={`Getting around ${location.name}`}
            text={content.intro}
          />
        </>
      ) : (
        <>
          {products.length > 0 && (
            <Section
              id="products"
              eyebrow={`Travel in ${location.name}`}
              title="Choose how you travel"
            >
              <ul className="grid gap-4 sm:grid-cols-2">
                {products.map((entry) => (
                  <li key={entry.page}>
                    <ProductLink
                      product={entry.page}
                      href={pathOf(location.slug, entry.page)}
                    />
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <Intro title={`About ${location.name}`} text={content.intro} />
          <Highlights
            location={location}
            highlights={content.highlights}
            canBook={!paused}
          />
        </>
      )}

      <Faqs
        title={
          product
            ? `Questions about ${label.toLowerCase()} in ${location.name}`
            : `Questions about ${location.name}`
        }
        faqs={content.faqs}
      />

      {product && (
        <nav
          aria-label={`More in ${location.name}`}
          className={`pt-[50px] sm:pt-[70px] ${gutter}`}
        >
          <ul className={`${column} flex flex-wrap gap-x-8 gap-y-3`}>
            <li>
              <MoreLink href={pathOf(location.slug)}>
                About {location.name}
              </MoreLink>
            </li>
            {products
              .filter((other) => other.page !== product)
              .map((other) => (
                <li key={other.page}>
                  <MoreLink href={pathOf(location.slug, other.page)}>
                    {LOCATION_PAGE_LABELS[other.page]} in {location.name}
                  </MoreLink>
                </li>
              ))}
          </ul>
        </nav>
      )}
    </>
  );
}

function Crumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 text-[0.85rem] text-[#334744]">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={crumb.path} className="flex items-center gap-x-2">
              {last ? (
                <span aria-current="page" className="font-semibold">
                  {crumb.name}
                </span>
              ) : (
                <>
                  <Link
                    href={crumb.path}
                    className={`underline-offset-4 hover:underline ${focus}`}
                  >
                    {crumb.name}
                  </Link>
                  <span aria-hidden>/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** What takes the search card's place while the location is paused. */
function PausedNotice({ name }: { name: string }) {
  return (
    <div className="rounded-[18px] bg-white px-6 py-7 text-[#102825] shadow-[0_22px_55px_rgba(9,43,39,0.16)] sm:rounded-[22px] sm:px-9 sm:py-8">
      <p className={eyebrow}>Not taking bookings for now</p>
      <p className="mt-2 max-w-[62ch] text-[1.05rem] text-[#324844]">
        We are not taking new bookings for {name} at the moment. Please check
        back soon, or{" "}
        <Link
          href="/"
          className={`font-semibold text-[#073c36] underline underline-offset-4 ${focus}`}
        >
          see where else we go
        </Link>
        .
      </p>
    </div>
  );
}

function Section({
  id,
  eyebrow: above,
  title,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className={`pt-[60px] sm:pt-[88px] ${gutter}`}
    >
      <div className={column}>
        {above && <p className={`${eyebrow} mb-2`}>{above}</p>}
        <h2 id={`${id}-title`} className={`${heading} mb-7`}>
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

function ProductLink({
  product,
  href,
}: {
  product: TripCategory;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`${panel} group flex h-full items-start gap-4 border border-transparent hover:border-[#073c36]/40 ${focus}`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e8f2ef] text-[#073c36]">
        <ProductIcon service={product} className="h-6 w-6 stroke-[1.8]" />
      </span>
      <span className="min-w-0">
        <strong className="block font-(family-name:--font-display) text-[1.5rem] leading-tight font-normal text-[#082f2b]">
          {LOCATION_PAGE_LABELS[product]}
        </strong>
        <span className="mt-1 block text-[#67726f]">
          {PRODUCTS[product].note}
        </span>
        <span className="mt-3 block text-[0.92rem] font-bold text-[#073c36] underline-offset-4 group-hover:underline">
          See vehicles and prices <span className="ml-1.5">→</span>
        </span>
      </span>
    </Link>
  );
}

/** The intro: its title beside its paragraphs from lg up. */
function Intro({ title, text }: { title: string; text: string }) {
  const paragraphs = paragraphsOf(text);
  if (paragraphs.length === 0) return null;
  return (
    <section
      aria-labelledby="intro-title"
      className={`pt-[60px] sm:pt-[88px] ${gutter}`}
    >
      <div className={`${column} grid gap-x-16 gap-y-6 lg:grid-cols-[1fr_2fr]`}>
        <h2 id="intro-title" className={heading}>
          {title}
        </h2>
        <div className="grid max-w-[70ch] gap-4 text-[1.05rem] leading-relaxed text-[#324844]">
          {paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

function Highlights({
  location,
  highlights,
  canBook,
}: {
  location: LocationView;
  highlights: PageHighlight[];
  /** Whether "Take me here" is offered: not while the location is paused. */
  canBook: boolean;
}) {
  if (highlights.length === 0) return null;
  return (
    <Section
      id="highlights"
      eyebrow="Highlights"
      title={`The best of ${location.name}`}
    >
      <ul className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
        {highlights.map((highlight, i) => {
          const address = canBook
            ? location.addresses.find(({ id }) => id === highlight.addressId)
            : undefined;
          return (
            <li key={i} className="flex flex-col items-start">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[17px] bg-[#dce9ec]">
                {highlight.image && (
                  <Image
                    src={highlight.image.url}
                    alt={highlight.image.alt}
                    fill
                    sizes="(min-width: 64rem) 400px, (min-width: 40rem) 50vw, 100vw"
                    className="object-cover"
                  />
                )}
              </div>
              <h3 className="mt-4 font-(family-name:--font-display) text-[1.5rem] leading-tight text-[#082f2b]">
                {highlight.name}
              </h3>
              <p className="mt-1.5 text-[#324844]">{highlight.text}</p>
              {address && <TakeMeHere address={address} />}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/** The product's active vehicle classes, each with its seats, luggage and starting price. */
async function VehicleClasses({ category }: { category: TripCategory }) {
  const classes = await vehicleClassCards(category);
  if (classes.length === 0) return null;
  return (
    <Section
      id="vehicles"
      eyebrow="Vehicles"
      title="Choose the vehicle that fits"
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((vehicleClass) => (
          <li key={vehicleClass.id} className={`${panel} flex flex-col`}>
            <h3 className="font-(family-name:--font-display) text-[1.5rem] leading-tight text-[#082f2b]">
              {vehicleClass.name}
            </h3>
            <p className="mt-1.5 text-[#324844]">{vehicleClass.description}</p>
            <p className="mt-3 text-[0.9rem] text-[#67726f]">
              {seatsLabel(vehicleClass)} · {vehicleClass.luggage}
            </p>
            <p className="mt-auto pt-5 text-[#67726f]">
              From{" "}
              <strong className="text-[1.3rem] font-bold text-[#073c36]">
                {formatMyr(vehicleClass.fromSen)}
              </strong>
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-[0.92rem] text-[#67726f]">
        The price of a trip depends on its distance or its hours. Search above
        for yours: the driver and fuel are included.
      </p>
    </Section>
  );
}

function Faqs({ title, faqs }: { title: string; faqs: PageFaq[] }) {
  const filled = faqs.filter((faq) => faq.question && faq.answer);
  if (filled.length === 0) return null;
  return (
    <Section id="faqs" eyebrow="Good to know" title={title}>
      <div className="max-w-[820px] border-t border-[#dce3e0]">
        {filled.map((faq, i) => (
          <details key={i} className="group border-b border-[#dce3e0]">
            <summary
              className={`flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-[1.08rem] font-semibold text-[#082f2b] [&::-webkit-details-marker]:hidden ${focus}`}
            >
              {faq.question}
              <span
                aria-hidden
                className="mt-0.5 text-[1.3rem] leading-none text-[#073c36] transition-transform group-open:rotate-45 motion-reduce:transition-none"
              >
                +
              </span>
            </summary>
            <div className="grid max-w-[70ch] gap-3 pb-6 text-[#324844]">
              {paragraphsOf(faq.answer).map((paragraph, j) => (
                <p key={j}>{paragraph}</p>
              ))}
            </div>
          </details>
        ))}
      </div>
    </Section>
  );
}

function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`font-bold text-[#073c36] underline-offset-4 hover:underline ${focus}`}
    >
      {children} <span className="ml-1.5">→</span>
    </Link>
  );
}
