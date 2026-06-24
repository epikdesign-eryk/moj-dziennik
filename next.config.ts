import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reverse proxy do PostHog (region EU) — ruch idzie przez naszą domenę pod /ingest,
  // dzięki czemu blokery reklam nie ucinają analityki. api_host w kliencie = "/ingest".
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  // Wymagane przez PostHog: nie przekierowuj /ingest na wariant z ukośnikiem.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
