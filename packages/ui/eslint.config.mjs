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
      // TS handles unused-vars, undef, and redeclare better than base ESLint
      // (a type and a const sharing a name is valid TS but trips base rules).
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-redeclare": "off",
    },
  },
];

export default config;
