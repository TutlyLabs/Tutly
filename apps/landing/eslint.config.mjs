import baseConfig from "@tutly/eslint-config/next";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    // Known backlog, capped by --max-warnings. The react-hooks compiler rules
    // require behavioural changes rather than mechanical edits.
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    ignores: [".next/**", "node_modules/**"],
  },
];

export default config;
