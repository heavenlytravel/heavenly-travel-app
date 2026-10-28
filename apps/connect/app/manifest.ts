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
    background_color: "#f8fafc",
    theme_color: "#0b2a4a",
    icons: [{ src: "/icon.png", sizes: "any", type: "image/png" }],
  };
}
