import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev server runs on h510m; the browser reaches it over Tailscale.
  allowedDevOrigins: [
    "100.74.71.54",
    "akieez-h510m",
    "akieez-h510m.tail4436c5.ts.net",
  ],
  transpilePackages: ["@repo/db", "@repo/email", "@repo/places"],
  images: {
    // Page images are on UploadThing: https://<app id>.ufs.sh/f/<key>. The
    // same host is checked by `isUploadUrl` in @repo/db.
    remotePatterns: [
      { protocol: "https", hostname: "*.ufs.sh", pathname: "/f/**" },
    ],
  },
  // The admin never belongs in search engines, on any host. Unlike the
  // customer site's header, this one stays after the move to
  // heavenlytravel.my. A header, not robots.txt: a crawler kept out by
  // robots.txt never fetches the page, so never sees the noindex.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
