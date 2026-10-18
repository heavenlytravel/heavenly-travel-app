import Link from "next/link";
import { LOCATION_PAGE_LABELS, locationPagePath } from "@repo/db";
import { Button } from "@repo/ui/button";
import { FileTextIcon } from "@repo/ui/icons";
import { notFound } from "next/navigation";
import { SectionHeader } from "../../../../_components/SectionHeader";
import {
  TILE_LINK,
  Tile,
  TileFoot,
  TileGrid,
} from "../../../../_components/Card";
import { Streamed, TileGridSkeleton } from "../../../../_components/Skeleton";
import { PageStatusBadge } from "../../../../_components/StatusBadges";
import { requireAdmin } from "../../../../_lib/access";
import { locationPageHref } from "../../../../_lib/routes";
import { locationPreviewUrl } from "../../../../_lib/site";
import { CardImage } from "../../_components/CardImage";
import { PreviewLink } from "../../_components/PreviewLink";
import { locationDetails, locationKey } from "../../_lib/location-data";

/**
 * Route: /locations/[slug]/pages. Marketing's tab: the location's pages, a
 * card each with its hero image, where it stands, its editor and its
 * preview. A page is published and unpublished in its editor.
 */
export default async function LocationPagesPage({
  params,
}: PageProps<"/locations/[slug]/pages">) {
  await requireAdmin("locations.manage");
  const { slug } = await params;
  const { id } = await locationKey(slug);

  return (
    <>
      <SectionHeader
        title="Pages"
        description="A published page is one the public can see once the location is live. “Published, edits waiting” means the public still sees the copy last published while the draft holds newer edits. Only the main page is needed to go live; a product page is an extra page about one product."
      />
      <div className="mt-6">
        <Streamed fallback={<TileGridSkeleton min="14rem" />}>
          {() => pages({ id })}
        </Streamed>
      </div>
    </>
  );
}

async function pages({ id }: { id: string }) {
  const location = await locationDetails(id);
  if (!location) notFound();

  return (
    <TileGrid min="14rem">
      {location.pages.map((page) => {
        const editorHref = locationPageHref(location.slug, page.page);
        return (
          <Tile key={page.page}>
            <CardImage
              image={page.heroImage}
              sizes="(min-width: 1024px) 16rem, (min-width: 640px) 50vw, 100vw"
              fallback={
                <span className="grid justify-items-center gap-1.5 text-xs">
                  <FileTextIcon className="size-7 text-neutral-300" />
                  No hero image yet
                </span>
              }
            >
              <PageStatusBadge status={page.status} />
            </CardImage>
            <div className="min-w-0 px-4 pt-3 pb-4">
              <h2 className="truncate text-base font-semibold tracking-tight">
                {/* The link's box covers the card, so the whole card opens the editor. */}
                <Link href={editorHref} className={TILE_LINK}>
                  {LOCATION_PAGE_LABELS[page.page]}
                </Link>
              </h2>
              <p className="truncate text-xs text-neutral-500">
                {locationPagePath(location.slug, page.page)}
              </p>
            </div>
            <TileFoot>
              <Button asChild size="sm">
                <Link href={editorHref}>Edit</Link>
              </Button>
              <PreviewLink
                size="sm"
                href={locationPreviewUrl(location.slug, page.page)}
              />
            </TileFoot>
          </Tile>
        );
      })}
    </TileGrid>
  );
}
