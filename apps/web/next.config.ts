import type { NextConfig } from "next";
import path from "path";

const isCapacitor = process.env.NEXT_PUBLIC_BUILD_TARGET === "capacitor";

const nextConfig: NextConfig = {
  // Web build is `standalone` (Next.js server). Mobile build uses static
  // export so the bundle ships inside the Capacitor app.
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
