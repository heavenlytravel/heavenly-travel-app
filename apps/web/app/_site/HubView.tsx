import Image from "next/image";
import {
  SITE_PAGE_LABELS,
  type HubPage,
  type PageContent,
} from "@repo/db/server";
import {
  Faqs,
  HomeCrumbs,
  Intro,
  JsonLd,
  MissingMark,
  column,
  emptyPartsOf,
  gutter,
} from "../_components/page-parts";
import { HeroHeading } from "../_components/page-headings";
import { SearchProvider } from "../_components/search/SearchProvider";
import { TripFromLink } from "../_components/search/TripFromLink";
import { Booking } from "../_home/Sections";
import styles from "../_home/home.module.css";
import { faqDataOf } from "../_lib/seo";
import type { SectionData } from "../_sections/data";
import { PageSections } from "../_sections/PageSections";
import { HUB_DEFAULTS } from "./hub-defaults";

/**
 * A service's hub, /car-with-driver or /coach-charter: its hero with the
 * search card open on the service, which a link may set to a kind of trip
 * (`TripFromLink`), then Marketing's sections in their order
 * (`PageSections`), the locations that serve it among them, then the
 * intro and the FAQs when Marketing wrote them. Until the hub is first
 * published it shows the words and photo it was built with (`HUB_DEFAULTS`),
 * as the home page does. The public page and the staff preview render
 * this; the preview marks each empty part. See docs/261026-service-hubs.md.
 */

export function HubView({
  page,
  content,
  sections,
  preview = false,
}: {
  page: HubPage;
  /** The hub's content; null before its first publish. */
  content: PageContent | null;
  /** Its sections and what they show (`sectionDataOf`). */
  sections: SectionData;
  preview?: boolean;
}) {
  const label = SITE_PAGE_LABELS[page];
  const defaults = HUB_DEFAULTS[page];
  const empty = emptyPartsOf("hub", preview);
  const headline = content?.heroHeadline || defaults.headline;
  const subheadline = content?.heroSubheadline || defaults.subheadline;
  const faqData = content ? faqDataOf(content) : null;
  return (
    <main className="pb-[60px] sm:pb-[88px]">
      {faqData && <JsonLd data={[faqData]} />}
      <SearchProvider product={page}>
        <TripFromLink />
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
                eyebrow="Our Services"
                line={
                  <>
                    {subheadline}
                    {content &&
                      !content.heroSubheadline &&
                      empty.subheadline && (
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
          <Booking />
        </section>
      </SearchProvider>

      <PageSections look="hub" data={sections} hub={page} preview={preview} />

      {content && (
        <>
          <Intro
            title={`About ${label}`}
            text={content.intro}
            empty={empty.intro}
          />
          <Faqs
            title={`Questions About ${label}`}
            faqs={content.faqs}
            empty={empty.faqs}
          />
        </>
      )}
    </main>
  );
}
