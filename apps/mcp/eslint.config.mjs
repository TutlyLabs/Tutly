import baseConfig from "@tutly/eslint-config/server";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.ts"],
    // The base JS rules misfire on TS-only constructs (parameter properties,
    // type-only signatures, DOM lib types). typescript-eslint covers both.
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off",
    },
  },
];

export default config;
