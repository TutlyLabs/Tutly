import { defineConfig } from "tsup";

import packageJson from "./package.json";

export default defineConfig({
  entry: ["src/index.ts", "src/commands/**/*.ts"],
  format: ["cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: "lib",
  target: "node18",
  external: Object.keys(packageJson.dependencies || {}),
  banner: {
    js: "#!/usr/bin/env node",
  },
});
