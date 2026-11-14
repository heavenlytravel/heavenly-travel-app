import {
  SITE_PAGE_LABELS,
  locationPagePath,
  sectionHasItems,
  type HubPage,
  type PageSection,
} from "@repo/db";
import { blogPostCards } from "../_blog/BlogCards";
import {
  MissingPart,
  PageCards,
  missingBlock,
} from "../_components/page-parts";
import { DestinationCards, PhotoCards } from "../_home/DestinationCards";
import { BookingSteps } from "./BookingSteps";
import type { SectionData } from "./data";
import { SectionShell, type SectionLook } from "./SectionShell";
import { Testimonials } from "./Testimonials";
import { TrustedBy } from "./TrustedBy";
import { VehicleOptions } from "./VehicleOptions";
import { WhyUs } from "./WhyUs";

/**
 * A page's sections between its hero and its intro, in Marketing's order:
 * those switched on, each left out of a public page while it has nothing
 * to show. In a staff preview a section on but empty keeps its heading
 * with a placeholder saying what it needs, and a service card the public
 * cannot open yet is shown with a mark. See docs/261114-landing-sections.md.
 */
export function PageSections({
  look,
  data,
  hub = null,
  preview,
}: {
  look: SectionLook;
  data: SectionData;
  /** The hub the sections are on, which its Locations name; null on the home page. */
  hub?: HubPage | null;
  preview: boolean;
}) {
  return data.sections
    .filter((section) => section.on)
    .map((section) => (
      <SectionView
        key={section.type}
        look={look}
        section={section}
        data={data}
        hub={hub}
        preview={preview}
      />
    ));
}

/** What a preview says in place of a section with nothing to show. */
const NEEDS: Record<PageSection["type"], string> = {
  "why-us": "Add a point to show this section",
  services: "Add a card to show this section",
  vehicles: "Pick classes on sale to show this section",
  steps: "Add steps to show this section",
  destinations: "Pick top choices on the Website screen to show this section",
  locations: "",
  "trusted-by": "Add a logo with its image to show this section",
  testimonials: "Add a quote to show this section",
  news: "Publish a blog post to show this section",
};

function SectionView({
  look,
  section,
  data,
  hub,
  preview,
}: {
  look: SectionLook;
  section: PageSection;
  data: SectionData;
  hub: HubPage | null;
  preview: boolean;
}) {
  const shownCards = preview ? data.cards : data.cards.filter((c) => c.shown);
  const filled =
    sectionHasItems(section) &&
    (section.type === "trusted-by"
      ? section.logos.some((logo) => logo.image)
      : section.type === "services"
        ? shownCards.length > 0
        : section.type === "vehicles"
          ? data.classes.length > 0
          : section.type === "destinations"
            ? data.choices.length > 0
            : section.type === "news"
              ? data.posts.length > 0
              : true);

  // Only a hub has locations; they say they are coming when there are none, as before.
  if (section.type === "locations" && !hub) return null;
  if (section.type === "locations" && hub && data.locations.length === 0) {
    const label = SITE_PAGE_LABELS[hub];
    return (
      <SectionShell look={look} id="locations" section={section}>
        {preview ? (
          <MissingPart
            part={`No location offers ${label.toLowerCase()} yet: publish a location's ${label} page`}
            className={missingBlock}
          />
        ) : (
          <p className="max-w-[60ch] text-lead text-body">
            We are bringing {label.toLowerCase()} to more places soon.
          </p>
        )}
      </SectionShell>
    );
  }

  if (!filled) {
    if (!preview) return null;
    return (
      <SectionShell look={look} id={section.type} section={section}>
        <MissingPart
          part={NEEDS[section.type]}
          className={`${missingBlock} mx-auto max-w-[1240px]`}
        />
      </SectionShell>
    );
  }

  switch (section.type) {
    case "why-us":
      return <WhyUs look={look} section={section} />;
    case "services":
      return (
        <SectionShell look={look} id="services" section={section}>
          <PhotoCards
            cards={shownCards.map((card) => ({
              key: card.key,
              href: card.href,
              image: card.image,
              tag: null,
              name: card.title,
              line: card.text,
              cta: card.button,
              note: card.shown
                ? undefined
                : "Hidden: where it leads is not public",
            }))}
          />
        </SectionShell>
      );
    case "vehicles":
      return (
        <VehicleOptions look={look} section={section} classes={data.classes} />
      );
    case "steps":
      return <BookingSteps look={look} section={section} />;
    case "destinations":
      return (
        <SectionShell look={look} id="destinations" section={section}>
          <DestinationCards choices={data.choices} />
        </SectionShell>
      );
    case "locations":
      if (!hub) return null;
      return (
        <SectionShell look={look} id="locations" section={section}>
          <PageCards
            cards={data.locations.map((location) => ({
              key: location.slug,
              href: locationPagePath(location.slug, { page: hub, slug: "" }),
              title: location.name,
              text: location.text,
              image: location.image,
              cta: "See Vehicles and Prices",
            }))}
          />
        </SectionShell>
      );
    case "trusted-by":
      return <TrustedBy look={look} section={section} />;
    case "testimonials":
      return <Testimonials look={look} section={section} />;
    case "news":
      return (
        <SectionShell look={look} id="news" section={section}>
          <div className="mx-auto max-w-[1240px] text-left">
            <PageCards cards={blogPostCards(data.posts, preview)} />
          </div>
        </SectionShell>
      );
  }
}
