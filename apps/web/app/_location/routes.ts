import "server-only";
import {
  LANDING_PAGE,
  getAdminAccess,
  isTripCategory,
  locationPagePath,
  locationPreviewPath,
  pageOfView,
  type LocationPageKey,
  type LocationView,
  type LocationViewPage,
} from "@repo/db/server";
import { notFound, redirect } from "next/navigation";
import {
  isLocationSlug,
  locationPreview,
  publicLocation,
} from "../_lib/locations";
import { signInHref } from "../_lib/routes";

/**
 * What a location route shows. The public routes and the preview routes are
 * thin: each asks here for its location and page and renders the shared
 * components. Whoever may not see the page is answered here too, with a
 * 404, a redirect or the sign-in.
 */

export type LocationRoute = { location: LocationView; page: LocationViewPage };

/** The public location at the slug; a 404 when the public sees none there. */
export async function publicLocationAt(slug: string): Promise<LocationView> {
  const location = await publicLocation(slug);
  if (!location) notFound();
  return location;
}

/**
 * The public page at the address. An unknown product is a 404; a product
 * whose page is not published sends the visitor to the location's landing
 * page.
 */
export async function publicPageAt(
  slug: string,
  product?: string,
): Promise<LocationRoute> {
  const location = await publicLocationAt(slug);
  if (product !== undefined && !isTripCategory(product)) notFound();
  const page = pageOfView(location, product ?? LANDING_PAGE);
  if (!page) redirect(locationPagePath(slug));
  return { location, page };
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
  product?: string,
): Promise<LocationRoute> {
  if (!isLocationSlug(slug)) notFound();
  if (product !== undefined && !isTripCategory(product)) notFound();
  const key: LocationPageKey = product ?? LANDING_PAGE;

  const access = await getAdminAccess("locations.manage");
  if (access.status === "signed-out") {
    redirect(signInHref(locationPreviewPath(slug, key)));
  }
  if (access.status !== "ok") notFound();

  const location = await locationPreview(slug);
  const page = location && pageOfView(location, key);
  if (!location || !page) notFound();
  return { location, page };
}
