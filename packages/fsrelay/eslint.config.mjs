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
      // Pre-existing backlog in this VS Code extension, surfaced when
      // typescript-eslint was first switched on. Capped by --max-warnings so
      // it cannot grow; not fixed here.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-empty": "warn",
    },
  },
  {
    // Build config is CommonJS by necessity.
    files: ["*.config.js", "*.config.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  {
    ignores: ["out/**", "dist/**", "node_modules/**", "themes/**", "ui/**"],
  },
];

export default config;
