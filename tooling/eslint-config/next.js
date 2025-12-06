import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-config-turbo/flat";
import onlyWarn from "eslint-plugin-only-warn";
import tseslint from "typescript-eslint";
import globals from "globals";
import nextVitals from "eslint-config-next/core-web-vitals";

/**
 * Shared ESLint configuration for Next.js applications.
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  js.configs.recommended,
  eslintConfigPrettier,
  ...turboPlugin,
  ...nextVitals,
  {
    plugins: {
      "only-warn": onlyWarn,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        React: true,
        JSX: true,
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      "no-undef": "off",
    },
  },
  {
    ignores: ["**/node_modules/", "**/.next/", "**/.*.js"],
  },
];
