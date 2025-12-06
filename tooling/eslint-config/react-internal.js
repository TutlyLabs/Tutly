import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-config-turbo/flat";
import onlyWarn from "eslint-plugin-only-warn";
import tseslint from "typescript-eslint";
import globals from "globals";

/**
 * Shared ESLint configuration for internal React library packages.
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  js.configs.recommended,
  eslintConfigPrettier,
  ...turboPlugin,
  {
    plugins: {
      "only-warn": onlyWarn,
    },
    languageOptions: {
      globals: {
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
  },
  {
    ignores: ["**/node_modules/", "**/dist/", "**/.*.js"],
  },
];
