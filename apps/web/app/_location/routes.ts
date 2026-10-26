import "server-only";
import {
  LANDING_REF,
  PAGE_KIND_RULES,
  childrenOf,
  getAdminAccess,
  isLocationPageRef,
  isLocationSection,
  locationPagePath,
  locationPreviewPath,
  pageOfView,
  type LocationPageRef,
  type LocationView,
  type LocationViewPage,
} from "@repo/db/server";
import { notFound, redirect } from "next/navigation";
import {
  isLocationSlug,
  locationPreview,
  previewPageBody,
  publicLocation,
  publicPageBody,
} from "../_lib/locations";
import { signInHref } from "../_lib/routes";

/**
 * What a location route shows. The public routes and the preview routes are
 * thin: each asks here for its location and page and renders the shared
 * components. Whoever may not see the page is answered here too, with a
 * 404, a redirect or the sign-in.
 */

export type LocationRoute = {
  location: LocationView;
  page: LocationViewPage;
  /** A post's text, which the view leaves out; empty on every other page. */
  body: string;
};

/** The public location at the slug; a 404 when the public sees none there. */
export async function publicLocationAt(slug: string): Promise<LocationView> {
  const location = await publicLocation(slug);
  if (!location) notFound();
  return location;
}

/**
 * The page the address names, from its segments under the location: none,
 * a section, or a section and a slug. Null for an address no page can have.
 */
function refOf(section?: string, entry?: string): LocationPageRef | null {
  if (section === undefined) return LANDING_REF;
  if (!isLocationSection(section)) return null;
  const ref = { page: section, slug: entry ?? "" };
  return isLocationPageRef(ref) ? ref : null;
}

/**
 * The public page at the address. An address no page can have is a 404. A
 * section's page that is not published sends the visitor to the location's
 * main page; a class's page that is not public, its class off there or the
 * page not published, to its section's page, which the class appears on.
 * Both are temporary: the page can come back. A page Marketing added that
 * is not public is a 404, as any slug no page has.
 */
export async function publicPageAt(
  slug: string,
  section?: string,
  entry?: string,
): Promise<LocationRoute> {
  const location = await publicLocationAt(slug);
  const ref = refOf(section, entry);
  if (!ref) notFound();
  const page = pageOfView(location, ref);
  if (!page) {
    if (ref.slug === "") redirect(locationPagePath(slug));
    // A class of the section's own product, not one of another's.
    const children = childrenOf(ref.page);
    if (
      children?.type === "classes" &&
      location.classes.some(
        (entry) =>
          entry.slug === ref.slug && entry.category === children.category,
      )
    ) {
      const own = { page: ref.page, slug: "" };
      redirect(
        locationPagePath(slug, pageOfView(location, own) ? own : LANDING_REF),
      );
    }
    notFound();
  }
  const body = PAGE_KIND_RULES[page.kind].body
    ? await publicPageBody(slug, page.page, page.slug)
    : "";
  return { location, page, body };
}

/**
 * The staff preview of the page at the address: the draft, for a signed-in
 * admin who holds `locations.manage`. A signed-out visitor is sent to sign
 * in and comes back here; anyone else gets a 404. The address is checked
 * before the session is read, because the proxy attaches no session to a
 * path that looks like a file.
 */
export async function previewPageAt(
  slug: string,
  section?: string,
  entry?: string,
): Promise<LocationRoute> {
  if (!isLocationSlug(slug)) notFound();
  const ref = refOf(section, entry);
  if (!ref) notFound();

  const access = await getAdminAccess("locations.manage");
  if (access.status === "signed-out") {
    redirect(signInHref(locationPreviewPath(slug, ref)));
  }
  if (access.status !== "ok") notFound();

  const location = await locationPreview(slug);
  const page = location && pageOfView(location, ref);
  if (!location || !page) notFound();
  const body = PAGE_KIND_RULES[page.kind].body
    ? await previewPageBody(slug, page.page, page.slug)
    : "";
  return { location, page, body };
}
