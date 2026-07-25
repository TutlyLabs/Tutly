import baseConfig from "@tutly/eslint-config/library";

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
    ignores: ["out/**", "dist/**", "node_modules/**", "themes/**", "ui/**"],
  },
];

export default config;
