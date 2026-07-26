import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-config-turbo/flat";
import tseslint from "typescript-eslint";
import globals from "globals";

/**
 * Shared ESLint configuration for internal React library packages.
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  ...turboPlugin,
  {
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
