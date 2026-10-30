/**
 * The account page's offer of a password: a sign-in by code to an account
 * that has none lands there first, with the page it was going to as `next`.
 * The page shows the offer at its top, and "Not now" goes on. Browser-safe.
 */
export const ADD_PASSWORD_PARAM = "add";
export const NEXT_PARAM = "next";

/** The account page, opened on its offer of a password, then on to `next`. */
export function addPasswordHref(accountPath: string, next: string) {
  const params = new URLSearchParams({
    [ADD_PASSWORD_PARAM]: "password",
    [NEXT_PARAM]: next,
  });
  return `${accountPath}?${params}`;
}
