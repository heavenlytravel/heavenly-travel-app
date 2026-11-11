import type { MetadataRoute } from "next";

/**
 * So a driver installs Connect to their phone's home screen (`InstallApp`
 * offers it). Its icons are the brand's wings, white as in the footer, over
 * "HT-CONNECT" on the brand navy (--navy): the plain
 * ones for where they show whole, the maskable ones, drawn inside the
 * middle circle, for Android to shape. The iPhone's is `apple-icon.png`,
 * the browser tab's the plain wings, `icon.png`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/~",
    name: "Heavenly Travel Connect",
    short_name: "HT Connect",
    description:
      "Jobs and trip reports for Heavenly Travel's vendors and drivers",
    start_url: "/~",
    scope: "/",
    display: "standalone",
    // The brand's mist (--mist) behind the splash, its navy (--navy) for the bar.
    background_color: "#f0f5fa",
    theme_color: "#003876",
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/pwa/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/pwa/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
