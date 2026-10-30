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
