import baseConfig from "@tutly/eslint-config/server";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    ignores: ["dist/**", "node_modules/**"],
  },
];

export default config;
