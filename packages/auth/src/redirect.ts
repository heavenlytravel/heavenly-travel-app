/**
 * Where a sign-in goes once it is done: the `redirect_url` the page was
 * opened with (Clerk's middleware sets it, as do the apps' own links), when
 * it is an address of the same app, else the app's start. Anything else
 * (another site, `//host`, `javascript:`) is ignored, so a link cannot use
 * the sign-in to send someone elsewhere.
 */
export const REDIRECT_PARAM = "redirect_url";

export function safeRedirect(
  value: string | null | undefined,
  fallback: string,
  origin: string,
): string {
  if (!value) return fallback;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return url.origin === origin
      ? `${url.pathname}${url.search}${url.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Leaves for `to` once a session has started (Clerk's `finalize`), by a
 * whole page load: every server component reads the new session at once,
 * and no client navigation ends in a server redirect, which React's
 * timings in development throw on ("cannot have a negative time stamp").
 */
export function openSignedIn(
  { decorateUrl }: { decorateUrl: (url: string) => string },
  to: string,
) {
  window.location.assign(decorateUrl(to));
}
