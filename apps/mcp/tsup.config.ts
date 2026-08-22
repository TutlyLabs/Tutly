import { defineConfig } from "tsup";

import packageJson from "./package.json";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  external: Object.keys(packageJson.dependencies),
  banner: { js: "#!/usr/bin/env node" },
});
