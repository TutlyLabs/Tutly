import type { NextConfig } from "next";
import path from "path";

const isCapacitor = process.env.NEXT_PUBLIC_BUILD_TARGET === "capacitor";

const nextConfig: NextConfig = {
  output: isCapacitor ? "export" : "standalone",
  ...(isCapacitor
    ? {}
    : { outputFileTracingRoot: path.join(__dirname, "../..") }),

  typescript: { ignoreBuildErrors: true },

  ...(isCapacitor
    ? {}
    : {
        experimental: {
          serverActions: {
            allowedOrigins: ["learn.tutly.in", "localhost:3000"],
          },
        },
        async rewrites() {
          return [
            { source: "/sandpack", destination: "/sandpack/index.html" },
            { source: "/sandpack/", destination: "/sandpack/index.html" },
          ];
        },
        async headers() {
          return [
            {
              source: "/.well-known/apple-app-site-association",
              headers: [
                { key: "Content-Type", value: "application/json" },
                { key: "Cache-Control", value: "public, max-age=3600" },
              ],
            },
            {
              source: "/.well-known/assetlinks.json",
              headers: [
                { key: "Content-Type", value: "application/json" },
                { key: "Cache-Control", value: "public, max-age=3600" },
              ],
            },
            {
              source: "/sandpack/static/:path*",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
                { key: "Access-Control-Allow-Origin", value: "*" },
              ],
            },
            {
              source: "/sandpack/:path*",
              headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
            },
          ];
        },
      }),

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
