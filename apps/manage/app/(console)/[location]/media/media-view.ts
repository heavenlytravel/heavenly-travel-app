/**
 * How the Media screen lays its images out, remembered in a cookie as the
 * sidebar's fold is, so the page reads it and the first paint already
 * matches. Read by the page and written by the switch on the screen.
 */

export const MEDIA_VIEWS = ["grid", "table"] as const;
export type MediaView = (typeof MEDIA_VIEWS)[number];

export const MEDIA_VIEW_LABELS: Record<MediaView, string> = {
  grid: "Grid",
  table: "Table",
};

/** The cookie that holds it. */
export const MEDIA_VIEW_COOKIE = "media_view";

/** A year: the choice holds until it is changed. */
const MEDIA_VIEW_MAX_AGE = 60 * 60 * 24 * 365;

/** The view the cookie holds, or the grid without one. */
export function mediaViewOf(value: string | undefined): MediaView {
  return value === "table" ? "table" : "grid";
}

/** Remembers the view chosen, in the browser. */
export function rememberMediaView(view: MediaView) {
  document.cookie = `${MEDIA_VIEW_COOKIE}=${view}; path=/; max-age=${MEDIA_VIEW_MAX_AGE}; samesite=lax`;
}
