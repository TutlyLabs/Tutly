import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },

  serverExternalPackages: ["better-auth", "@better-auth/cli"],

  experimental: {
    serverActions: {
      allowedOrigins: ["*.tutly.in", "localhost:3000", "*.localhost:3000"],
    },
  },

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
};

export default nextConfig;
