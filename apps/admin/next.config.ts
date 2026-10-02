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
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
