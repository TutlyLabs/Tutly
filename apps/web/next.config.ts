import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // transpilePackages: [],

  images: {
    unoptimized: true,
    domains: ["*"],
  },
};

export default nextConfig;
