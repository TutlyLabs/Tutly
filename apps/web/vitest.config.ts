import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The app's tsconfig sets `jsx: "preserve"` for Next; the test transform has
  // to emit real calls instead.
  // The app's tsconfig sets `jsx: "preserve"` for Next. Vitest 4 transforms
  // with oxc, not esbuild, so the override has to go here — an esbuild block
  // is silently ignored and .tsx suites then fail to parse rather than fail to
  // pass, which a run summary hides.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
