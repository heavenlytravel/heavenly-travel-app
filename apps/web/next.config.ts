import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev server runs on h510m; the browser reaches it over Tailscale.
  allowedDevOrigins: [
    "100.74.71.54",
    "akieez-h510m",
    "akieez-h510m.tail4436c5.ts.net",
  ],
  transpilePackages: ["@repo/db", "@repo/places"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
