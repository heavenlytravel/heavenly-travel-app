import { isUploadUrl } from "@repo/db";

/**
 * Where the console loads a footer logo from: an uploaded one from its
 * host, one the customer site ships (/brand/…) from the site, at
 * `siteUrl`. Browser-safe.
 */
export function logoSrc(siteUrl: string, url: string) {
  return isUploadUrl(url) ? url : siteUrl + url;
}
