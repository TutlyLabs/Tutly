import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The app's tsconfig sets `jsx: "preserve"` for Next; the test transform has
  // to emit real calls instead.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
