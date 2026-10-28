import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev server runs on h510m; the browser reaches it over Tailscale.
  allowedDevOrigins: [
    "100.74.71.54",
    "akieez-h510m",
    "akieez-h510m.tail4436c5.ts.net",
  ],
  transpilePackages: ["@repo/console", "@repo/db", "@repo/email"],
  images: {
    // A vendor's vehicle photos are on UploadThing, as the admin's are:
    // https://<app id>.ufs.sh/f/<key>, the host `isUploadUrl` in @repo/db checks.
    remotePatterns: [
      { protocol: "https", hostname: "*.ufs.sh", pathname: "/f/**" },
    ],
  },
  // Connect is for vendors and drivers, never for search engines. A
  // header, not robots.txt, so a crawler that fetches a page sees it.
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
