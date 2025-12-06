import baseConfig from "@tutly/eslint-config/react-internal";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    ignores: ["node_modules/**"],
  },
];

export default config;
