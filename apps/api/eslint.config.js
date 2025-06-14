import baseConfig from "@tutly/eslint-config/base";

/** @type {import('typescript-eslint').Config} */
export default [
  ...baseConfig,
  {
    ignores: ["dist/**"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },
];
