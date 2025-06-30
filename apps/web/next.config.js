/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",

  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  images: {
    unoptimized: true,
    domains: ["*"],
  },
};

export default config;
