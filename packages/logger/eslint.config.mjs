import baseConfig from "@tutly/eslint-config/library";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    ignores: ["dist/**", "node_modules/**", "**/__tests__/**"],
  },
];

export default config;
