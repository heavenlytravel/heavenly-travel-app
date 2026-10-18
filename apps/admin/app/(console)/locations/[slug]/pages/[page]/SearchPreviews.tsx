import type { PageImage } from "@repo/db";
import Image from "next/image";

/** Where search results cut a title and a description, near enough: Google measures pixels, not characters. */
const SHOWN = { title: 60, description: 155 } as const;

const cut = (text: string, at: number) =>
  text.length > at ? `${text.slice(0, at - 1).trimEnd()}…` : text;

/** "heavenlytravel.my › langkawi › car-with-driver", as a result shows the address. */
function crumbsOf(url: string) {
  const { host, pathname } = new URL(url);
  return [host.replace(/^www\./, ""), ...pathname.split("/").filter(Boolean)];
}

/**
 * The page as a search result would show it: the site, the address, the
 * meta title and the description, cut where results cut them. A sketch, not
 * a promise: a search engine may write its own.
 */
export function SearchResultPreview({
  url,
  title,
  description,
  fallbackTitle,
}: {
  url: string;
  title: string;
  description: string;
  /** The title the page falls back to when the meta title is empty. */
  fallbackTitle: string;
}) {
  return (
    <figure className="grid gap-1.5">
      <figcaption className="text-xs font-medium text-neutral-500">
        In search results
      </figcaption>
      <div className="rounded-md border border-neutral-200 bg-white px-4 py-3 font-[arial,sans-serif]">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600"
          >
            H
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-sm text-neutral-900">
              Heavenly Travel
            </span>
            <span className="block truncate text-xs text-neutral-600">
              {crumbsOf(url).join(" › ")}
            </span>
          </span>
        </div>
        <p className="mt-2 text-lg leading-snug text-[#1a0dab]">
          {cut(title || fallbackTitle, SHOWN.title)}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-[#4d5156]">
          {description ? (
            cut(description, SHOWN.description)
          ) : (
            <span className="text-neutral-400">
              No description: the search engine picks a line from the page.
            </span>
          )}
        </p>
      </div>
    </figure>
  );
}

/**
 * A link to the page as WhatsApp, Facebook or LinkedIn draw it when it is
 * shared: the share image, else the hero image, cropped to the wide card,
 * then the title, the description and the site.
 */
export function SharedLinkPreview({
  url,
  title,
  description,
  image,
}: {
  url: string;
  title: string;
  description: string;
  image: PageImage | null;
}) {
  return (
    <figure className="grid max-w-md gap-1.5">
      <figcaption className="text-xs font-medium text-neutral-500">
        As a shared link
      </figcaption>
      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
        {image ? (
          <div className="relative aspect-[1.91/1] w-full">
            <Image
              src={image.url}
              alt=""
              fill
              sizes="448px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-[1.91/1] w-full items-center justify-center bg-neutral-100 text-xs text-neutral-500">
            No image yet: add the hero image or a share image.
          </div>
        )}
        <div className="grid gap-0.5 border-t border-neutral-200 bg-neutral-50 px-3 py-2.5">
          <span className="text-[11px] tracking-wide text-neutral-500 uppercase">
            {new URL(url).host.replace(/^www\./, "")}
          </span>
          <span className="truncate text-sm font-semibold text-neutral-900">
            {title || "No meta title yet"}
          </span>
          <span className="line-clamp-2 text-xs text-neutral-600">
            {description}
          </span>
        </div>
      </div>
    </figure>
  );
}
