import baseConfig from "@tutly/eslint-config/server";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    ignores: ["dist/**", "node_modules/**", "runtime/**"],
  },
  {
    files: ["src/**/*.ts"],
    rules: {
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default config;
