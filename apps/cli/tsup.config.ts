import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/commands/**/*.ts"],
  format: ["cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: "lib",
  target: "node18",
  external: ["keytar"],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
