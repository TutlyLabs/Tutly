import baseConfig from "@tutly/eslint-config/library";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    ignores: ["node_modules/**"],
  },
];

export default config;
