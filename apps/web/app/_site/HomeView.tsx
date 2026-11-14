import Image from "next/image";
import type { PageContent } from "@repo/db/server";
import { Photo } from "../_components/Brand";
import {
  Faqs,
  Intro,
  JsonLd,
  MissingMark,
  MissingPart,
  emptyPartsOf,
} from "../_components/page-parts";
import { SearchProvider } from "../_components/search/SearchProvider";
import styles from "../_home/home.module.css";
import { Booking } from "../_home/Sections";
import { faqDataOf } from "../_lib/seo";
import type { SectionData } from "../_sections/data";
import { PageSections } from "../_sections/PageSections";

/**
 * The home page: a full-screen pale photo hero with the booking card for
 * all six services resting on its floor, then Marketing's sections in
 * their order (`PageSections`): why to book with us, the services, the
 * locations we cover and the rest; then the intro and the FAQs when
 * Marketing wrote them. The
 * hero's words and photo are the published home page's (`content`); until
 * the home page is first published it shows the words and photo it was
 * designed with. The public page and the staff preview render this. The preview marks each empty part: a dashed placeholder
 * where it goes, in its section, or a mark beside the words or photo it was
 * designed with, shown while the part is empty (`emptyPartsOf`).
 */

/** What the home page shows before Marketing publishes its own. */
export const HOME_DEFAULTS = {
  description:
    "Book car rental, chauffeured rides, coach rental, attractions, hotels and custom travel packages across Malaysia with Heavenly Travel.",
  tagline: "Travel",
  headline: "made simple.",
  subheadline:
    "Cars, drivers, coaches, stays and experiences—thoughtfully brought together for your journey.",
} as const;

export function HomeView({
  content,
  sections,
  preview = false,
}: {
  /** The home page's content; null before its first publish. */
  content: PageContent | null;
  /** Its sections and what they show (`sectionDataOf`). */
  sections: SectionData;
  preview?: boolean;
}) {
  const tagline = content ? content.tagline : HOME_DEFAULTS.tagline;
  const headline = content?.heroHeadline || HOME_DEFAULTS.headline;
  const subheadline = content?.heroSubheadline || HOME_DEFAULTS.subheadline;
  const image = content?.heroImage ?? null;
  const faqData = content ? faqDataOf(content) : null;
  const empty = emptyPartsOf("home", preview);
  return (
    <SearchProvider>
      {faqData && <JsonLd data={[faqData]} />}
      <main>
        <section
          aria-labelledby="hero-title"
          className="relative flex min-h-svh flex-col"
        >
          {/* From lg up the photo is fixed to the viewport, so it fills the
              window the same at any zoom. The clip keeps it inside the hero
              without clipping the booking card's menus. Below lg the photo runs
              the hero's whole height: the card's glass needs it behind all
              of the stacked card. */}
          <div className="absolute inset-x-0 top-0 h-full bg-mist [clip-path:inset(0)]">
            {image ? (
              <Image
                src={image.url}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes="100vw"
                preload
                className="absolute inset-0 h-full w-full object-cover object-center lg:fixed"
              />
            ) : (
              <Photo
                src="/brand/hero-langkawi.jpg"
                alt="Eagle Square in Langkawi from the air"
                className="absolute inset-0 h-full w-full object-cover object-center lg:fixed"
                loading="eager"
              />
            )}
            <div className={`${styles.heroWash} absolute inset-0`} />
          </div>
          {/* The words sit in the middle of the room between the header and
              the booking card. From sm up one type size follows the window's
              height as well as its width, so the headline and the whole card
              fit on one screen down to about 600px tall; the script word is
              sized from it, so the pair keeps its proportions. */}
          <div className="relative z-(--layer-raised) flex flex-1 flex-col justify-center px-[22px] pt-[125px] pb-6 sm:px-[clamp(24px,6vw,96px)] sm:pt-[92px] sm:pb-8">
            {!image && empty.heroImage && (
              <p className="mb-6">
                <MissingMark part={empty.heroImage} alone />
              </p>
            )}
            <div className="text-6xl sm:text-hero">
              {tagline ? (
                <p className="origin-left -rotate-3 font-hand text-[1.07em] leading-[0.75] text-ink sm:text-[0.83em]">
                  {tagline}
                </p>
              ) : (
                empty.tagline && (
                  <MissingPart
                    part={empty.tagline}
                    className="mb-3 min-h-12 w-fit origin-left -rotate-3 rounded-xl sm:min-h-16"
                  />
                )
              )}
              <h1
                id="hero-title"
                className="mt-[0.1em] mb-[0.25em] max-w-[14ch] font-serif text-[1em] leading-[0.9] text-ink sm:max-w-none"
              >
                {headline}
                {!content?.heroHeadline && empty.headline && (
                  <MissingMark part={empty.headline} />
                )}
              </h1>
            </div>
            <p className="max-w-[330px] text-body sm:max-w-[500px] sm:text-lg">
              {subheadline}
              {!content?.heroSubheadline && empty.subheadline && (
                <MissingMark part={empty.subheadline} />
              )}
            </p>
          </div>
          <p
            aria-hidden
            className="absolute top-[16%] right-[7%] z-(--layer-raised) mt-8 hidden -rotate-[7deg] border-b-[3px] border-azure font-hand text-3xl leading-[0.85] text-white lg:block"
          >
            More
            <br />
            than a trip
          </p>

          <Booking />
        </section>

        <div className="pb-[55px] sm:pb-[90px]">
          <PageSections look="home" data={sections} preview={preview} />
        </div>

        {content && (
          <div className="pb-[60px] sm:pb-[88px] [&>section:first-child]:pt-0">
            <Intro
              title="About Heavenly Travel"
              text={content.intro}
              empty={empty.intro}
            />
            <Faqs
              title="Questions About Travelling with Us"
              faqs={content.faqs}
              empty={empty.faqs}
            />
          </div>
        )}
      </main>
    </SearchProvider>
  );
}
