import baseConfig from "@tutly/eslint-config/next";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    // Known backlogs. These stay reported and the package is capped with
    // --max-warnings, so the count cannot grow, but clearing them is a
    // separate piece of work: the `any` and unused-binding counts are in the
    // hundreds, and the react-hooks compiler rules require behavioural changes
    // that cannot be made mechanically.
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "dist/**",
      "build/**",
      ".cache/**",
      ".turbo/**",
      ".cap-stash/**",
      "android/**",
      "ios/**",
      "public/**",
      "**/*.min.js",
      "**/*.min.css",
    ],
  },
];

export default config;
