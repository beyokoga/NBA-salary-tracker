import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-mode only: Next 16 blocks its dev resources (HMR websocket, dev chunks)
  // from cross-site origins. Allow the sandbox preview proxy and loopback IPs so
  // `npm run dev` stays interactive there. Production builds are unaffected.
  allowedDevOrigins: ["127.0.0.1", "**.e2b.app"],
  // Team crests are vendored into /public/logos by scripts/scrape_teams.py, so
  // next/image only ever serves same-origin assets here.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
