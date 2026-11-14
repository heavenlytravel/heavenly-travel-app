import "server-only";
import {
  builtInSections,
  isSiteLinkShown,
  sectionOfType,
  siteLinkAudienceOf,
  siteLinkHref,
  type BlogPostView,
  type ClassCard,
  type HubPage,
  type PageContent,
  type PageSection,
  type ServiceCardLink,
  type ServiceLocationCard,
  type TopChoiceCard,
} from "@repo/db/server";
import { publishedBlogPosts } from "../_lib/blog";
import {
  activeClassCards,
  publicLocationCards,
  serviceLocationCards,
  topChoiceCards,
} from "../_lib/locations";
import { publishedSitePages } from "../_lib/site-pages";
import { HUB_DEFAULTS } from "../_site/hub-defaults";

/**
 * What the sections of a page read besides themselves, on the server: the
 * pages a service card leads to and their photos, the classes, the posts,
 * the top choices and the locations serving a hub. Each is read only when
 * a section that shows it is on, and each read is the site's cached one.
 */

/** A service card as the page draws it: where it goes and the photo it shows. */
export type ShownServiceCard = {
  key: string;
  href: string;
  /** The card's own photo, else that of the page it leads to; null for none. */
  image: { url: string } | null;
  title: string;
  text: string;
  button: string;
  /** Whether the public can open where it leads; one that cannot is left out of a public page. */
  shown: boolean;
};

export type SectionData = {
  /** The page's sections, its built-in ones before its first publish. */
  sections: PageSection[];
  cards: ShownServiceCard[];
  /** The classes Vehicle Options picked that are on sale, in its order. */
  classes: ClassCard[];
  /** The newest posts Latest News shows, as many as it asks. */
  posts: BlogPostView[];
  choices: TopChoiceCard[];
  /** On a hub, the locations whose page of its service is published. */
  locations: ServiceLocationCard[];
};

const none = <T>(): Promise<T[]> => Promise.resolve([]);

/**
 * The sections of the home page, or of `hub`, from its content, null
 * before its first publish, with what those that are on show.
 */
export async function sectionDataOf(
  content: PageContent | null,
  hub: HubPage | null,
): Promise<SectionData> {
  const sections = content?.sections ?? builtInSections(hub ? "hub" : "home");
  const on = <T extends PageSection["type"]>(type: T) => {
    const section = sectionOfType(sections, type);
    return section?.on ? section : undefined;
  };
  const services = on("services");
  const vehicles = on("vehicles");
  const news = on("news");
  const linksPosts = services?.cards.some((c) => c.link.kind === "post");

  const [pages, locationCards, posts, classes, choices, locations] =
    await Promise.all([
      services
        ? publishedSitePages()
        : Promise.resolve<Awaited<ReturnType<typeof publishedSitePages>>>({}),
      services ? publicLocationCards() : none<TopChoiceCard>(),
      news || linksPosts ? publishedBlogPosts() : none<BlogPostView>(),
      vehicles ? activeClassCards() : none<ClassCard>(),
      on("destinations") ? topChoiceCards() : none<TopChoiceCard>(),
      hub && on("locations")
        ? serviceLocationCards(hub)
        : none<ServiceLocationCard>(),
    ]);

  const audience = siteLinkAudienceOf(
    pages,
    locationCards.map((card) => card.slug),
    posts.map((post) => post.slug),
  );

  /** The photo of the page a card leads to, for a card with none of its own. */
  function photoOf(link: ServiceCardLink): { url: string } | null {
    switch (link.kind) {
      case "page":
      case "search": {
        const page = link.kind === "page" ? link.page : link.service;
        const hubDefault =
          page in HUB_DEFAULTS
            ? { url: HUB_DEFAULTS[page as HubPage].image }
            : null;
        return pages[page]?.content.heroImage ?? hubDefault;
      }
      case "location":
        return (
          locationCards.find((card) => card.slug === link.slug)?.image ?? null
        );
      case "post":
        return (
          posts.find((post) => post.slug === link.slug)?.content.heroImage ??
          null
        );
    }
  }

  const byId = new Map(classes.map((c) => [c.id, c]));
  return {
    sections,
    cards: (services?.cards ?? []).map((card, i) => ({
      key: `card-${i}`,
      href: siteLinkHref(card.link),
      image: card.image ?? photoOf(card.link),
      title: card.title,
      text: card.text,
      button: card.button,
      shown: isSiteLinkShown(card.link, audience),
    })),
    classes: (vehicles?.classIds ?? []).flatMap((id) => byId.get(id) ?? []),
    posts: news ? posts.slice(0, news.count) : [],
    choices,
    locations,
  };
}
