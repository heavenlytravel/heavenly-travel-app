/**
 * How to scroll to something: a scroll the user can follow, or a jump when
 * they ask for less motion. Pass it as `behavior` to `scrollIntoView` or
 * `scrollTo`. In the browser only.
 */
export function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}
