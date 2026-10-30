import Image from "next/image";
import {
  HUB_PAGES,
  SECTIONS,
  SITE_PAGE_LABELS,
  locationPagePath,
  sitePagePath,
  type HubPage,
  type PageContent,
  type PublishedSitePage,
  type ServiceLocationCard,
  type SitePageKey,
} from "@repo/db/server";
import {
  Faqs,
  HomeCrumbs,
  Intro,
  JsonLd,
  MissingMark,
  MissingPart,
  PageCards,
  Section,
  column,
  emptyPartsOf,
  gutter,
  missingBlock,
} from "../_components/page-parts";
import { HeroHeading } from "../_components/page-headings";
import type { PhotoCard } from "../_home/DestinationCards";
import styles from "../_home/home.module.css";
import { faqDataOf } from "../_lib/seo";

/**
 * A service's hub, /car-with-driver or /coach-charter: its hero, the
 * locations that serve it, each opening its own page of the service, then
 * the intro and the FAQs when Marketing wrote them. Until the hub is first
 * published it shows the words and photo it was built with (`HUB_DEFAULTS`),
 * as the home page does. The public page and the staff preview render
 * this; the preview marks each empty part. See docs/261026-service-hubs.md.
 */

/** What a hub shows before Marketing writes it: its words, and a photo of the brand's. */
export const HUB_DEFAULTS: Record<
  HubPage,
  { headline: string; subheadline: string; description: string; image: string }
> = {
  "car-with-driver": {
    headline: "Car with driver",
    subheadline:
      "A private car and a local driver for airport transfers, day trips and hourly hire.",
    description:
      "Book a car with a driver across Malaysia: airport transfers, day trips and hourly hire with local drivers.",
    image: "/brand/chauffeur.jpg",
  },
  "coach-charter": {
    headline: "Coach charter",
    subheadline:
      "Minibuses and coaches with a driver, for groups, events and tours.",
    description:
      "Charter a minibus or coach with a driver across Malaysia, for groups, events and tours.",
    image: "/brand/coach.jpg",
  },
};

/** The hubs as the home page's photo cards, each with its published hero image or its built-in photo. */
export function hubCards(
  published: Partial<Record<SitePageKey, PublishedSitePage>>,
): PhotoCard[] {
  return HUB_PAGES.map((page) => ({
    key: page,
    href: sitePagePath(page),
    image: published[page]?.content.heroImage ?? {
      url: HUB_DEFAULTS[page].image,
    },
    tag: null,
    name: SITE_PAGE_LABELS[page],
    line: SECTIONS[page].note,
  }));
}

export function HubView({
  page,
  content,
  locations,
  preview = false,
}: {
  page: HubPage;
  /** The hub's content; null before its first publish. */
  content: PageContent | null;
  locations: readonly ServiceLocationCard[];
  preview?: boolean;
}) {
  const label = SITE_PAGE_LABELS[page];
  const defaults = HUB_DEFAULTS[page];
  const empty = emptyPartsOf("service", preview);
  const headline = content?.heroHeadline || defaults.headline;
  const subheadline = content?.heroSubheadline || defaults.subheadline;
  const faqData = content ? faqDataOf(content) : null;
  return (
    <main className="pb-[60px] sm:pb-[88px]">
      {faqData && <JsonLd data={[faqData]} />}
      <section
        aria-labelledby="hero-title"
        className="relative flex min-h-[420px] flex-col lg:min-h-[520px]"
      >
        <div className="absolute inset-0 overflow-hidden bg-mist">
          <Image
            src={content?.heroImage?.url ?? defaults.image}
            alt={content?.heroImage?.alt ?? ""}
            fill
            preload
            sizes="100vw"
            className="object-cover"
          />
          <div className={`${styles.heroWash} absolute inset-0`} />
        </div>
        <div
          className={`relative z-(--layer-raised) flex flex-1 flex-col justify-center pt-7 pb-12 ${gutter}`}
        >
          <div className={column}>
            {content && !content.heroImage && empty.heroImage && (
              <p className="mb-5">
                <MissingMark part={empty.heroImage} alone />
              </p>
            )}
            <HomeCrumbs current={label} />
            <HeroHeading
              eyebrow="Our services"
              line={
                <>
                  {subheadline}
                  {content && !content.heroSubheadline && empty.subheadline && (
                    <MissingMark part={empty.subheadline} />
                  )}
                </>
              }
            >
              {headline}
              {content && !content.heroHeadline && empty.headline && (
                <MissingMark part={empty.headline} />
              )}
            </HeroHeading>
          </div>
        </div>
      </section>

      <Section
        id="locations"
        eyebrow="Choose a location"
        title="Where we offer it"
      >
        {locations.length > 0 ? (
          <PageCards
            cards={locations.map((location) => ({
              key: location.slug,
              href: locationPagePath(location.slug, { page, slug: "" }),
              title: location.name,
              text: location.text,
              image: location.image,
              cta: "See vehicles and prices",
            }))}
          />
        ) : preview ? (
          <MissingPart
            part={`No location offers ${label.toLowerCase()} yet: publish a location's ${label} page`}
            className={missingBlock}
          />
        ) : (
          <p className="max-w-[60ch] text-lead text-body">
            We are bringing {label.toLowerCase()} to more places soon.
          </p>
        )}
      </Section>

      {content && (
        <>
          <Intro
            title={`About ${label.toLowerCase()}`}
            text={content.intro}
            empty={empty.intro}
          />
          <Faqs
            title={`Questions about ${label.toLowerCase()}`}
            faqs={content.faqs}
            empty={empty.faqs}
          />
        </>
      )}
    </main>
  );
}
