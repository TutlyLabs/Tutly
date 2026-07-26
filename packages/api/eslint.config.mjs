import baseConfig from "@tutly/eslint-config/library";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    ignores: ["node_modules/**", "dist/**"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-redeclare": "off",
      // Known backlog, capped by --max-warnings so it cannot grow.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default config;
