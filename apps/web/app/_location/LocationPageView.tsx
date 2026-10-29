import Image from "next/image";
import Link from "next/link";
import {
  CONTACT,
  LANDING_PAGE,
  LANDING_REF,
  SECTIONS,
  childrenOf,
  classOfPage,
  formatMyr,
  linkedChildrenOf,
  locationPagePath,
  locationPreviewPath,
  pageNameInView,
  paragraphsOf,
  pageOfView,
  servicePagesOf,
  type LocationPageRef,
  type LocationSection,
  type LocationView,
  type LocationViewPage,
  type TripCategory,
} from "@repo/db/server";
import { eyebrow } from "../(site)/_components/Page";
import { ProductIcon } from "../_components/Brand";
import { ClassCard } from "../_components/ClassCard";
import {
  Breadcrumbs,
  Cover,
  Faqs,
  Intro,
  JsonLd,
  MissingMark,
  MissingPart,
  MoreLink,
  PageCards,
  Prose,
  Section,
  column,
  emptyPartsOf,
  formatPageDate,
  gutter,
  missingBlock,
  missingLook,
  type EmptyPart,
  type PageCardData,
} from "../_components/page-parts";
import { ServiceTabsSearch } from "../_components/search/ServiceTabsSearch";
import styles from "../_home/home.module.css";
import { SEARCH_CARD_ID, type ProductKey } from "../_lib/search";
import { vehicleClassCards, type VehicleClassCard } from "../_lib/locations";
import { TakeMeHere } from "./LocationSearch";
import { crumbsOf, structuredDataOf } from "./seo";

/**
 * One page of a location, laid out by its kind. Every page but the blog's
 * opens with the hero and the search card on its floor; the blog reads as
 * a blog, its pages opening with their title and cover and no card.
 * Then by kind: the main page offers the services, the intro, the popular
 * places, the newest posts and the FAQs; a service's page its classes or
 * its places, the intro and the FAQs; a page that lists others, its cards;
 * a class's page the class; a place its intro and FAQs and other places; a
 * post its text, its FAQs and other posts. The public pages and the staff
 * preview both render this; `preview` keeps the links inside the preview.
 * Links to other pages follow the public rule (`isLinkedPage`). A part
 * with nothing in it is left out of a public page, so a half-written draft
 * still reads; the preview keeps the part's frame and heading and shows a
 * dashed placeholder where its content goes, so Marketing sees what is
 * missing (`emptyPartsOf`). See docs/261025-marketing-pages.md.
 */

/** How many posts the main page shows before "All posts". */
const LANDING_POSTS = 3;
/** How many others a place or a post offers at its foot. */
const MORE_OF_THE_SAME = 3;

/** The search card tab of each service's section. */
const SERVICE_PRODUCTS: Partial<Record<LocationSection, ProductKey>> = {
  "car-with-driver": "car-with-driver",
  "coach-charter": "coach-charter",
  "car-rental": "rental",
  attractions: "attraction",
  hotels: "hotel",
};

type ViewProps = {
  location: LocationView;
  page: LocationViewPage;
  /** A post's text; empty on every other page. */
  body: string;
  preview?: boolean;
};

export async function LocationPageView({
  location,
  page,
  body,
  preview = false,
}: ViewProps) {
  const pathOf = (ref: LocationPageRef = LANDING_REF) =>
    (preview ? locationPreviewPath : locationPagePath)(location.slug, ref);
  const isBlog = page.page === "blog";
  return (
    <>
      <JsonLd data={structuredDataOf(location, page)} />
      {page.kind === "article" ? (
        <ArticleView
          location={location}
          page={page}
          body={body}
          preview={preview}
          pathOf={pathOf}
        />
      ) : (
        <>
          {isBlog ? (
            <BlogHeader location={location} page={page} preview={preview} />
          ) : (
            <Hero location={location} page={page} preview={preview} />
          )}
          <PageBody
            location={location}
            page={page}
            preview={preview}
            pathOf={pathOf}
          />
        </>
      )}
    </>
  );
}

type PathOf = (ref?: LocationPageRef) => string;

/** What a preview shows in place of the main page's services while none is published. */
const NO_SERVICES: EmptyPart = "No services published yet";

/** What a preview shows in place of a service's classes while none is on sale there. */
const NO_CLASSES: EmptyPart = "No vehicle classes on sale yet";

/**
 * What a preview shows in place of a section's cards while none is listed:
 * "No popular places published yet". Nothing on a public page.
 */
function noCardsYet(
  section: LocationSection,
  preview: boolean,
): EmptyPart | undefined {
  const children = childrenOf(section);
  if (!preview || children?.type !== "entries") return undefined;
  return `No ${children.many} published yet`;
}

/** The parts of every page but a post under its hero, by kind. */
async function PageBody({
  location,
  page,
  preview,
  pathOf,
}: {
  location: LocationView;
  page: LocationViewPage;
  preview: boolean;
  pathOf: PathOf;
}) {
  const { content } = page;
  const name = pageNameInView(location, page);
  const empty = emptyPartsOf(page.kind, preview);
  const faqs = (
    <Faqs
      title={faqTitleOf(location, page, name)}
      faqs={content.faqs}
      empty={empty.faqs}
    />
  );

  if (page.page === LANDING_PAGE) {
    const places = linkedChildrenOf(location, "popular-places");
    const posts = linkedChildrenOf(location, "blog");
    return (
      <>
        <Services
          location={location}
          pathOf={pathOf}
          empty={preview ? NO_SERVICES : undefined}
        />
        <Intro
          title={`About ${location.name}`}
          text={content.intro}
          empty={empty.intro}
        />
        <EntryCards
          location={location}
          section="popular-places"
          entries={places}
          pathOf={pathOf}
          title={`Popular places in ${location.name}`}
          all
          empty={noCardsYet("popular-places", preview)}
        />
        <EntryCards
          location={location}
          section="blog"
          entries={posts.slice(0, LANDING_POSTS)}
          pathOf={pathOf}
          title="From the blog"
          all
          empty={noCardsYet("blog", preview)}
        />
        {faqs}
      </>
    );
  }

  const section = page.page;
  const def = SECTIONS[section];
  const isOwn = page.slug === "";

  if (page.kind === "class") {
    const vehicleClass = classOfPage(location, page);
    const category = childrenOf(section);
    return (
      <>
        {category?.type === "classes" && (
          <VehicleClasses
            location={location}
            category={category.category}
            only={page.slug}
            title={vehicleClass?.name ?? name}
            pathOf={pathOf}
          />
        )}
        <Intro
          title={`About the ${name}`}
          text={content.intro}
          empty={empty.intro}
        />
        {faqs}
        <FootLinks location={location} page={page} pathOf={pathOf} />
      </>
    );
  }

  if (page.kind === "place") {
    const others = linkedChildrenOf(location, section)
      .filter((other) => other.page !== page.page || other.slug !== page.slug)
      .slice(0, MORE_OF_THE_SAME);
    const children = childrenOf(section);
    return (
      <>
        <Intro
          title={`About ${name}`}
          text={content.intro}
          empty={empty.intro}
        />
        {faqs}
        {children?.type === "entries" && (
          <EntryCards
            location={location}
            section={section}
            entries={others}
            pathOf={pathOf}
            title={`More ${children.many} in ${location.name}`}
            all
          />
        )}
        <FootLinks location={location} page={page} pathOf={pathOf} />
      </>
    );
  }

  // A section's own page: a service, or a page that lists others.
  const children = childrenOf(section);
  return (
    <>
      {def.comingSoon && <ComingSoon label={def.label} name={location.name} />}
      {isOwn && children?.type === "classes" && (
        <VehicleClasses
          location={location}
          category={children.category}
          title="Choose the vehicle that fits"
          pathOf={pathOf}
          empty={preview ? NO_CLASSES : undefined}
        />
      )}
      {children?.type === "entries" && (
        <EntryCards
          location={location}
          section={section}
          entries={linkedChildrenOf(location, section)}
          pathOf={pathOf}
          title={
            section === "blog"
              ? "Latest posts"
              : page.kind === "listing"
                ? `${def.label} in ${location.name}`
                : `${def.label} we recommend`
          }
          lead={page.kind === "listing" ? content.intro : ""}
          emptyLead={page.kind === "listing" ? empty.intro : undefined}
          empty={noCardsYet(section, preview)}
        />
      )}
      {page.kind === "service" && (
        // Not the product and the place again: the headline has said that.
        <Intro
          title={
            children?.type === "classes" || section === "car-rental"
              ? `Getting around ${location.name}`
              : `${def.label} in ${location.name}`
          }
          text={content.intro}
          empty={empty.intro}
        />
      )}
      {faqs}
      <FootLinks location={location} page={page} pathOf={pathOf} />
    </>
  );
}

/** The heading of a page's FAQs: "Questions about coach charter in Langkawi". */
function faqTitleOf(
  location: LocationView,
  page: LocationViewPage,
  name: string,
) {
  if (page.page === LANDING_PAGE) return `Questions about ${location.name}`;
  if (page.kind === "class") {
    return `Questions about the ${name} in ${location.name}`;
  }
  if (page.slug !== "") return `Questions about ${name}`;
  return `Questions about ${name.toLowerCase()} in ${location.name}`;
}

/** The eyebrow over a page's headline. */
function eyebrowOf(location: LocationView, page: LocationViewPage) {
  if (page.page === LANDING_PAGE) return location.tagline ?? "Destination";
  const def = SECTIONS[page.page];
  const children = childrenOf(page.page);
  if (page.slug === "" || children?.type !== "entries") {
    return `${def.label} · ${location.name}`;
  }
  return `${capitalised(children.one)} · ${location.name}`;
}

/** A name as a heading starts it: "popular places" as "Popular places". */
function capitalised(text: string) {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

/** The top of every page but the blog's: the photo, the breadcrumb, the headline, and the search card on its floor. */
function Hero({
  location,
  page,
  preview,
}: {
  location: LocationView;
  page: LocationViewPage;
  preview: boolean;
}) {
  const { content } = page;
  const empty = emptyPartsOf(page.kind, preview);
  const paused = location.state === "paused";
  const address =
    page.kind === "place" && !paused
      ? location.addresses.find(({ id }) => id === content.addressId)
      : undefined;
  const missingImage = content.heroImage ? undefined : empty.heroImage;
  return (
    <section
      aria-labelledby="hero-title"
      className="relative flex flex-col lg:min-h-[620px]"
    >
      {/* Below lg the stacked card outgrows the photo, so the photo stops
          at a fixed height and the card rests across its lower edge. In a
          preview with no photo, its area takes the placeholder's look and
          the placeholder's mark opens the words, where nothing covers it. */}
      <div
        className={`absolute inset-x-0 top-0 h-[460px] overflow-hidden ${missingImage ? missingLook : "bg-mist"} lg:h-full`}
      >
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
          {missingImage && (
            <p className="mb-5">
              <MissingMark part={missingImage} alone />
            </p>
          )}
          <Breadcrumbs crumbs={crumbsOf(location, page, preview)} />
          <p className={`${eyebrow} mt-7 mb-3`}>
            {eyebrowOf(location, page)}
            {/* The main page's eyebrow is its tagline, "Destination" until it is written. */}
            {page.page === LANDING_PAGE &&
              !location.tagline &&
              empty.tagline && <MissingMark part={empty.tagline} />}
          </p>
          <h1
            id="hero-title"
            className="max-w-[18ch] font-serif text-display-lg leading-[0.98] text-ink"
          >
            {content.heroHeadline || pageNameInView(location, page)}
            {!content.heroHeadline && empty.headline && (
              <MissingMark part={empty.headline} />
            )}
          </h1>
          {content.heroSubheadline ? (
            <p className="mt-4 max-w-[540px] text-slate-700 sm:text-lg">
              {content.heroSubheadline}
            </p>
          ) : (
            empty.subheadline && (
              <MissingPart
                part={empty.subheadline}
                className="mt-4 min-h-11 max-w-[540px] rounded-xl"
              />
            )
          )}
          {address ? (
            <TakeMeHere address={address} />
          ) : (
            !paused &&
            empty.address && (
              <MissingPart
                part={empty.address}
                className="mt-4 min-h-11 w-fit rounded-full"
              />
            )
          )}
        </div>
      </div>
      <div
        id={SEARCH_CARD_ID}
        role="search"
        aria-label="Travel booking search"
        className="relative z-[3] mx-auto mb-2 w-[calc(100%-24px)] max-w-[1240px] sm:w-[88%] lg:mb-12"
      >
        {paused ? <PausedNotice name={location.name} /> : <ServiceTabsSearch />}
      </div>
    </section>
  );
}

/** What takes the search card's place while the location is paused. */
function PausedNotice({ name }: { name: string }) {
  return (
    <div className="rounded-card bg-white px-6 py-7 text-slate-900 shadow-panel sm:rounded-panel sm:px-9 sm:py-8">
      <p className={eyebrow}>Not taking bookings for now</p>
      <p className="mt-2 max-w-[62ch] text-lead text-slate-700">
        We are not taking new bookings for {name} at the moment. Please check
        back soon, or{" "}
        <Link
          href="/"
          className="font-semibold text-brand underline underline-offset-4 focus-ring"
        >
          see where else we go
        </Link>
        .
      </p>
    </div>
  );
}

/** On the page of a service not booked online yet: that it is coming, and how to ask meanwhile. */
function ComingSoon({ label, name }: { label: string; name: string }) {
  return (
    <section
      aria-label="Coming soon"
      className={`pt-[50px] sm:pt-[70px] ${gutter}`}
    >
      <div
        className={`${column} flex flex-col items-start justify-between gap-5 rounded-card border border-azure/30 bg-brand-tint px-6 py-6 sm:flex-row sm:items-center sm:px-8`}
      >
        <div>
          <p className={eyebrow}>Coming soon</p>
          <p className="mt-1.5 max-w-[60ch] text-lead text-slate-700">
            Booking {label.toLowerCase()} in {name} online is on its way. Until
            then, tell us what you need and we will arrange it for you.
          </p>
        </div>
        <a
          href={CONTACT.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 shrink-0 items-center rounded-full bg-brand px-6 text-base font-bold text-white hover:bg-brand-strong focus-ring"
        >
          WhatsApp us{" "}
          <span aria-hidden className="ml-2.5">
            ↗
          </span>
        </a>
      </div>
    </section>
  );
}

/** The services on the main page: a card per service page that is public, with its hero image. */
function Services({
  location,
  pathOf,
  empty,
}: {
  location: LocationView;
  pathOf: PathOf;
  /** In a preview, what stands in while no service's page is published. */
  empty?: EmptyPart;
}) {
  const services = servicePagesOf(location);
  if (services.length === 0 && !empty) return null;
  return (
    <Section
      id="services"
      eyebrow={`Travel in ${location.name}`}
      title="Plan your trip"
    >
      {services.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((entry) => {
            if (entry.page === LANDING_PAGE) return null;
            const def = SECTIONS[entry.page];
            const product = SERVICE_PRODUCTS[entry.page];
            const image = entry.content.heroImage;
            return (
              <li key={entry.page}>
                <Link
                  href={pathOf(entry)}
                  className="group flex h-full flex-col overflow-hidden rounded-card border border-transparent bg-white shadow-card hover:border-brand/40 focus-ring"
                >
                  <span className="relative block aspect-[16/9] w-full bg-mist">
                    {/* The link reads its own words: the photo would only repeat them. */}
                    {image && (
                      <Image
                        src={image.url}
                        alt=""
                        fill
                        sizes="(min-width: 64rem) 400px, (min-width: 40rem) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                      />
                    )}
                    {def.comingSoon && (
                      <span className="absolute top-3 left-3 rounded-full bg-white/95 px-3 py-1 text-caps font-bold text-brand">
                        Soon
                      </span>
                    )}
                  </span>
                  <span className="flex items-start gap-4 p-5 sm:p-6">
                    {product && (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
                        <ProductIcon
                          service={product}
                          className="h-6 w-6 stroke-[1.8]"
                        />
                      </span>
                    )}
                    <span className="min-w-0">
                      <strong className="block font-serif text-2xl leading-tight font-normal text-ink">
                        {def.label}
                      </strong>
                      <span className="mt-1 block text-muted">{def.note}</span>
                      <span className="mt-3 block text-copy font-bold text-brand underline-offset-4 group-hover:underline">
                        {childrenOf(entry.page)?.type === "classes"
                          ? "See vehicles and prices"
                          : "Explore"}{" "}
                        <span aria-hidden className="ml-1.5">
                          →
                        </span>
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        empty && <MissingPart part={empty} className={missingBlock} />
      )}
    </Section>
  );
}

/** The cards of a section's pages Marketing added: places with "Take me here", posts with their date. */
function EntryCards({
  location,
  section,
  entries,
  pathOf,
  title,
  all = false,
  lead = "",
  emptyLead,
  empty,
}: {
  location: LocationView;
  section: LocationSection;
  entries: LocationViewPage[];
  pathOf: PathOf;
  title: string;
  /** Whether to link the section's page beside the heading. */
  all?: boolean;
  /** Plain paragraphs under the heading: a listing page's intro. */
  lead?: string;
  /** In a preview, what stands in for an empty lead. */
  emptyLead?: EmptyPart;
  /** In a preview, what stands in while no card is listed. */
  empty?: EmptyPart;
}) {
  if (entries.length === 0 && lead === "" && !emptyLead && !empty) return null;
  const def = SECTIONS[section];
  const children = childrenOf(section);
  const paused = location.state === "paused";
  const own = { page: section, slug: "" };
  const cards: PageCardData[] = entries.map((entry) => {
    const address =
      entry.kind === "place" && !paused
        ? location.addresses.find(({ id }) => id === entry.content.addressId)
        : undefined;
    return {
      key: `${entry.page}/${entry.slug}`,
      href: pathOf(entry),
      title: pageNameInView(location, entry),
      text:
        entry.kind === "article" && entry.firstPublishedAt
          ? `${formatPageDate(entry.firstPublishedAt)} · ${entry.content.heroSubheadline}`
          : entry.content.heroSubheadline,
      image: entry.content.heroImage,
      extra: address ? <TakeMeHere address={address} /> : undefined,
    };
  });
  return (
    <Section
      id={`${section}-cards`}
      eyebrow={def.label}
      title={title}
      action={
        all && pageOfView(location, own) && children?.type === "entries" ? (
          <MoreLink href={pathOf(own)}>All {children.many}</MoreLink>
        ) : undefined
      }
    >
      {lead ? (
        <div className="-mt-2 mb-8 grid max-w-[70ch] gap-4 text-lead leading-relaxed text-slate-700">
          {paragraphsOf(lead).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      ) : (
        emptyLead && (
          <MissingPart
            part={emptyLead}
            className="-mt-2 mb-8 min-h-24 max-w-[70ch] rounded-card"
          />
        )
      )}
      {cards.length > 0 ? (
        <PageCards cards={cards} />
      ) : (
        empty && <MissingPart part={empty} className={missingBlock} />
      )}
    </Section>
  );
}

/**
 * The classes the location sells in a product, each with its picture, its
 * models and their photos, seats, luggage and starting price there, and a
 * link to its own page while that is public. `only` narrows them to one
 * class, on that class's page.
 */
async function VehicleClasses({
  location,
  category,
  only,
  title,
  pathOf,
  empty,
}: {
  location: LocationView;
  category: TripCategory;
  only?: string;
  title: string;
  pathOf: PathOf;
  /** In a preview, what stands in while no class is on sale. */
  empty?: EmptyPart;
}) {
  const all = await vehicleClassCards(location.slug, category);
  const classes = only ? all.filter((entry) => entry.slug === only) : all;
  if (classes.length === 0 && !empty) return null;
  const pictured = classes.some((c) => c.imageUrl !== null);
  const linked = new Set(
    linkedChildrenOf(location, category).map((entry) => entry.slug),
  );
  return (
    <Section id="vehicles" eyebrow="Vehicles" title={title}>
      {classes.length > 0 ? (
        <>
          <ul
            className={`grid gap-4 ${only ? "max-w-[560px]" : "sm:grid-cols-2 lg:grid-cols-3"}`}
          >
            {classes.map((vehicleClass) => (
              <LocationClassCard
                key={vehicleClass.id}
                vehicleClass={vehicleClass}
                pictured={pictured}
                href={
                  !only && linked.has(vehicleClass.slug)
                    ? pathOf({ page: category, slug: vehicleClass.slug })
                    : undefined
                }
              />
            ))}
          </ul>
          <p className="mt-5 text-copy text-muted">
            The price of a trip depends on its distance or its hours. Search
            above for yours: the driver and fuel are included.
          </p>
        </>
      ) : (
        empty && <MissingPart part={empty} className={missingBlock} />
      )}
    </Section>
  );
}

function LocationClassCard({
  vehicleClass,
  pictured,
  href,
}: {
  vehicleClass: VehicleClassCard;
  pictured: boolean;
  /** Its page, while that is public. */
  href?: string;
}) {
  return (
    <ClassCard vehicleClass={vehicleClass} pictured={pictured}>
      <p className="mt-auto flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 pt-5 text-muted">
        <span>
          From{" "}
          <strong className="text-xl font-bold text-brand">
            {formatMyr(vehicleClass.fromSen)}
          </strong>
        </span>
        {href && <MoreLink href={href}>About the {vehicleClass.name}</MoreLink>}
      </p>
    </ClassCard>
  );
}

/** The links at the foot of a page: the main page and the location's other public sections, and on a class's page the other classes. */
function FootLinks({
  location,
  page,
  pathOf,
}: {
  location: LocationView;
  page: LocationViewPage;
  pathOf: PathOf;
}) {
  if (page.page === LANDING_PAGE) return null;
  const section = page.page;
  const otherClasses =
    page.kind === "class"
      ? linkedChildrenOf(location, section).filter(
          (entry) => entry.slug !== page.slug,
        )
      : [];
  const sections = [...servicePagesOf(location)].filter(
    (entry) => !(entry.page === section && page.slug === ""),
  );
  const own = pageOfView(location, { page: section, slug: "" });
  return (
    <nav
      aria-label={`More in ${location.name}`}
      className={`pt-[50px] sm:pt-[70px] ${gutter}`}
    >
      <ul className={`${column} flex flex-wrap gap-x-8 gap-y-3`}>
        <li>
          <MoreLink href={pathOf()}>About {location.name}</MoreLink>
        </li>
        {page.slug !== "" && own && (
          <li>
            <MoreLink href={pathOf(own)}>
              {SECTIONS[section].label} in {location.name}
            </MoreLink>
          </li>
        )}
        {otherClasses.map((entry) => (
          <li key={entry.slug}>
            <MoreLink href={pathOf(entry)}>
              {pageNameInView(location, entry)}
            </MoreLink>
          </li>
        ))}
        {sections
          .filter((entry) => entry.page !== section)
          .map((entry) => (
            <li key={entry.page}>
              <MoreLink href={pathOf(entry)}>
                {pageNameInView(location, entry)} in {location.name}
              </MoreLink>
            </li>
          ))}
      </ul>
    </nav>
  );
}

/**
 * The top of the blog's pages, its own and a post's: the breadcrumb, the
 * eyebrow, the title and summary, a post's dates, and the cover.
 */
function BlogHeader({
  location,
  page,
  preview,
}: {
  location: LocationView;
  page: LocationViewPage;
  preview: boolean;
}) {
  const { content } = page;
  const empty = emptyPartsOf(page.kind, preview);
  const published = page.kind === "article" ? page.firstPublishedAt : null;
  const updated =
    page.publishedAt &&
    published &&
    page.publishedAt.slice(0, 10) !== published.slice(0, 10)
      ? page.publishedAt
      : null;
  return (
    <header className={`pt-7 ${gutter}`}>
      <div className="mx-auto w-full max-w-[900px]">
        <Breadcrumbs crumbs={crumbsOf(location, page, preview)} />
        <p className={`${eyebrow} mt-8 mb-3`}>{eyebrowOf(location, page)}</p>
        <h1
          id="hero-title"
          className="font-serif text-display leading-[1.02] text-ink"
        >
          {content.heroHeadline || pageNameInView(location, page)}
          {!content.heroHeadline && empty.headline && (
            <MissingMark part={empty.headline} />
          )}
        </h1>
        {content.heroSubheadline ? (
          <p className="mt-4 max-w-[640px] text-lg text-slate-700">
            {content.heroSubheadline}
          </p>
        ) : (
          empty.subheadline && (
            <MissingPart
              part={empty.subheadline}
              className="mt-4 min-h-11 max-w-[640px] rounded-xl"
            />
          )
        )}
        {published && (
          <p className="mt-5 text-copy text-muted">
            <time dateTime={published}>{formatPageDate(published)}</time>
            {updated && (
              <>
                {" · Updated "}
                <time dateTime={updated}>{formatPageDate(updated)}</time>
              </>
            )}
          </p>
        )}
      </div>
      <Cover image={content.heroImage} empty={empty.heroImage} />
    </header>
  );
}

/** A post: its header, its text and FAQs, then the newest other posts. */
function ArticleView({
  location,
  page,
  body,
  preview,
  pathOf,
}: {
  location: LocationView;
  page: LocationViewPage;
  body: string;
  preview: boolean;
  pathOf: PathOf;
}) {
  const others = linkedChildrenOf(location, "blog")
    .filter((other) => other.slug !== page.slug)
    .slice(0, MORE_OF_THE_SAME);
  const empty = emptyPartsOf(page.kind, preview);
  return (
    <>
      <article>
        <BlogHeader location={location} page={page} preview={preview} />
        <div className={`pt-10 sm:pt-14 ${gutter}`}>
          <div className="mx-auto w-full max-w-[900px]">
            <Prose text={body} empty={empty.body} />
          </div>
        </div>
      </article>
      <Faqs title="Good to know" faqs={page.content.faqs} empty={empty.faqs} />
      <EntryCards
        location={location}
        section="blog"
        entries={others}
        pathOf={pathOf}
        title="More from the blog"
        all
      />
      <FootLinks location={location} page={page} pathOf={pathOf} />
    </>
  );
}
