import type { MetadataRoute } from "next";

/** So a driver can add Connect to their phone's home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Heavenly Travel Connect",
    short_name: "HT Connect",
    description:
      "Jobs and trip reports for Heavenly Travel's vendors and drivers",
    start_url: "/",
    display: "standalone",
    // The brand's mist (--mist) behind the splash, its ink (--ink) for the bar.
    background_color: "#f0f5fa",
    theme_color: "#00264b",
    icons: [{ src: "/icon.png", sizes: "any", type: "image/png" }],
  };
}
