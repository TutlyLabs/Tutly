import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },

  // transpilePackages: [],

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://*.gstatic.com https://cdn.jsdelivr.net https://client.crisp.chat https://static.cloudflareinsights.com blob:",
              "frame-src 'self' https://www.youtube.com https://drive.google.com https://*.googleusercontent.com https://accounts.google.com https://play.google.com https://clients6.google.com",
              "frame-ancestors 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
