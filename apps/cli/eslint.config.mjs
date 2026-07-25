import baseConfig from "@tutly/eslint-config/server";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // TypeScript already reports these, and the base rules misfire on
      // declaration merging and type-only bindings.
      "no-redeclare": "off",
      "no-undef": "off",
      "no-unused-vars": "off",
    },
  },
  {
    ignores: ["lib/**", "bin/**", "node_modules/**", "oclif.manifest.json"],
  },
];

export default config;
