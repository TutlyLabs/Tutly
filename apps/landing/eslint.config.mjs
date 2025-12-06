import baseConfig from "@tutly/eslint-config/next";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    ignores: [".next/**", "node_modules/**"],
  },
];

export default config;
