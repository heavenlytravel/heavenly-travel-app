/// <reference types="google.maps" />

/**
 * Loads Google's JavaScript map once per page, with the browser key, and
 * answers its maps library. The script tag is added on first use, so a
 * page without a map never loads it. Browser only. Google's drawing library
 * is deprecated, so the zone maker draws polygons itself, with the map's
 * own clicks.
 */

declare global {
  interface Window {
    google?: typeof google;
    /** The callback the script calls when it is ready. */
    __onGoogleMapsReady?: () => void;
    /** The callback Google calls when it refuses the key: not activated, not allowed here, or wrong. */
    gm_authFailure?: () => void;
  }
}

let loading: Promise<typeof google> | null = null;

/** Whether Google has refused the key on this page, and who wants to know. */
let refused = false;
const refusalListeners = new Set<() => void>();

export function loadGoogleMaps(key: string): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps loads in the browser only"));
  }
  if (window.google?.maps) return Promise.resolve(window.google);
  loading ??= new Promise((resolve, reject) => {
    window.__onGoogleMapsReady = () => {
      if (window.google) resolve(window.google);
      else reject(new Error("Google Maps did not load"));
    };
    window.gm_authFailure = () => {
      refused = true;
      for (const listener of refusalListeners) listener();
    };
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key,
      v: "weekly",
      loading: "async",
      callback: "__onGoogleMapsReady",
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => {
      loading = null;
      reject(new Error("Google Maps did not load"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * Calls the listener when Google refuses the key, which it does after the
 * map is drawn, over a greyed map: the key's project has not enabled the
 * Maps JavaScript API, the key does not allow this site, or the key is
 * wrong. Answers the unsubscribe; calls at once if it was refused already.
 */
export function onKeyRefused(listener: () => void) {
  refusalListeners.add(listener);
  if (refused) listener();
  return () => {
    refusalListeners.delete(listener);
  };
}

/** The maps library, loaded: the map, polygons and polylines. */
export async function loadMapsLibrary(key: string) {
  const g = await loadGoogleMaps(key);
  return (await g.maps.importLibrary("maps")) as google.maps.MapsLibrary;
}
