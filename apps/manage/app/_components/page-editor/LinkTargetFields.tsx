"use client";

import {
  HUB_PAGES,
  SITE_LINK_KIND_LABELS,
  SITE_PAGE_LABELS,
  TRIP_MODES,
  TRIP_MODE_LABELS,
  isHubPage,
  isTripMode,
  isWebsitePageKey,
  type SiteLinkKind,
  type SiteLinkTarget,
  type SiteLinkTargetOf,
  type WebsitePageKey,
} from "@repo/db";
import { Input } from "@repo/ui/field";
import { Select } from "@repo/ui/select";

/** A site page a link may open, and whether the public sees it. */
export type LinkablePage = {
  page: WebsitePageKey;
  label: string;
  published: boolean;
};

/** A location a link may open, and whether the public sees it. */
export type LinkableLocation = { slug: string; name: string; public: boolean };

/** A blog post a link may open, and whether the public sees it. */
export type LinkablePost = { slug: string; title: string; published: boolean };

/** What a link may open, each with whether the public sees it. */
export type LinkChoices = {
  pages: readonly LinkablePage[];
  locations: readonly LinkableLocation[];
  /** None where links do not open posts, such as the footer. */
  posts?: readonly LinkablePost[];
};

/** The target a link of the kind starts at when the kind is picked: the first of its choices. */
export function firstTargetOf(
  kind: SiteLinkKind,
  choices: LinkChoices,
): SiteLinkTarget {
  switch (kind) {
    case "page": {
      const first =
        choices.pages.find((p) => p.page !== "home") ?? choices.pages[0];
      return { kind, page: first?.page ?? "about-us" };
    }
    case "location":
      return { kind, slug: choices.locations[0]?.slug ?? "" };
    case "post":
      return { kind, slug: choices.posts?.[0]?.slug ?? "" };
    case "search":
      return { kind, service: HUB_PAGES[0], mode: TRIP_MODES[0] };
    case "url":
      return { kind, url: "" };
  }
}

/** The name of what a link opens, as its text would say it; none for a web address or a search card. */
export function targetNameOf(
  target: SiteLinkTarget,
  choices: LinkChoices,
): string | undefined {
  switch (target.kind) {
    case "page":
      return choices.pages.find((p) => p.page === target.page)?.label;
    case "location":
      return choices.locations.find((l) => l.slug === target.slug)?.name;
    case "post":
      return choices.posts?.find((p) => p.slug === target.slug)?.title;
    default:
      return undefined;
  }
}

/**
 * Why the public is not shown a link, or null when it is: the page or the
 * post is not published, the location is not public, or nothing has the
 * address any more, its slug changed or it was deleted.
 */
export function targetNoteOf(
  target: SiteLinkTarget,
  choices: LinkChoices,
): string | null {
  switch (target.kind) {
    case "page":
      return choices.pages.find((p) => p.page === target.page)?.published ===
        false
        ? "Left out until the page is published."
        : null;
    case "location": {
      if (target.slug === "") return null;
      const location = choices.locations.find((l) => l.slug === target.slug);
      if (!location) {
        return `No location is at /${target.slug} any more, so this link is left out. Choose its location again.`;
      }
      return location.public ? null : "Left out until the location is public.";
    }
    case "post": {
      if (target.slug === "") return null;
      const post = choices.posts?.find((p) => p.slug === target.slug);
      if (!post) {
        return "That post is gone, so this link is left out. Choose a post again.";
      }
      return post.published ? null : "Left out until the post is published.";
    }
    default:
      return null;
  }
}

/**
 * Where a link goes, as pickers in a row: what kind of place it opens,
 * from `kinds`, then which one. A web address is typed; a search card is
 * a service and a kind of trip; the rest are picked from `choices`, each
 * marked where the public cannot open it yet. Its note (`targetNoteOf`)
 * is the caller's to show.
 */
export function LinkTargetFields<K extends SiteLinkKind>({
  kinds,
  target,
  onChange,
  choices,
}: {
  kinds: readonly K[];
  target: SiteLinkTargetOf<K>;
  onChange: (target: SiteLinkTargetOf<K>) => void;
  choices: LinkChoices;
}) {
  const set = (next: SiteLinkTarget) => onChange(next as SiteLinkTargetOf<K>);
  const t = target as SiteLinkTarget;
  return (
    <>
      <Select
        aria-label="Opens"
        className="w-40"
        value={t.kind}
        options={kinds.map((kind) => ({
          value: kind,
          label: SITE_LINK_KIND_LABELS[kind],
        }))}
        onValueChange={(kind) => {
          const next = kinds.find((k) => k === kind);
          if (next && next !== t.kind) set(firstTargetOf(next, choices));
        }}
      />
      {t.kind === "page" ? (
        <Select
          aria-label="Site page"
          className="w-56"
          value={t.page}
          options={choices.pages.map((p) => ({
            value: p.page,
            label: p.published ? p.label : `${p.label} (not published)`,
          }))}
          onValueChange={(page) => {
            if (isWebsitePageKey(page)) set({ kind: "page", page });
          }}
        />
      ) : t.kind === "location" ? (
        <Select
          aria-label="Location"
          className="w-56"
          value={t.slug}
          placeholder="Choose a location"
          options={choices.locations.map((l) => ({
            value: l.slug,
            label: l.public ? l.name : `${l.name} (not public)`,
          }))}
          onValueChange={(slug) => set({ kind: "location", slug })}
        />
      ) : t.kind === "post" ? (
        <Select
          aria-label="Blog post"
          className="w-64"
          value={t.slug}
          placeholder="Choose a post"
          options={(choices.posts ?? []).map((p) => ({
            value: p.slug,
            label: p.published ? p.title : `${p.title} (not published)`,
          }))}
          onValueChange={(slug) => set({ kind: "post", slug })}
        />
      ) : t.kind === "search" ? (
        <>
          <Select
            aria-label="Service"
            className="w-44"
            value={t.service}
            options={HUB_PAGES.map((page) => ({
              value: page,
              label: SITE_PAGE_LABELS[page],
            }))}
            onValueChange={(service) => {
              if (isHubPage(service)) set({ ...t, service });
            }}
          />
          <Select
            aria-label="Kind of trip"
            className="w-36"
            value={t.mode}
            options={TRIP_MODES.map((mode) => ({
              value: mode,
              label: TRIP_MODE_LABELS[mode],
            }))}
            onValueChange={(mode) => {
              if (isTripMode(mode)) set({ ...t, mode });
            }}
          />
        </>
      ) : (
        <Input
          aria-label="Address"
          className="w-56"
          autoComplete="off"
          placeholder="https://… or /booking"
          value={t.url}
          onChange={(event) => set({ kind: "url", url: event.target.value })}
        />
      )}
    </>
  );
}
