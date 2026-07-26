import baseConfig from "@tutly/eslint-config/react-internal";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    ignores: ["node_modules/**"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // TS handles unused-vars and undef checking better than base ESLint.
      "no-unused-vars": "off",
      "no-undef": "off",
      // Known backlog, capped by --max-warnings so it cannot grow.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default config;
