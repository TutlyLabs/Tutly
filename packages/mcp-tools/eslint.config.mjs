import baseConfig from "@tutly/eslint-config/library";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  { ignores: ["node_modules/**"] },
  {
    files: ["src/**/*.ts"],
    rules: { "no-unused-vars": "off", "no-undef": "off" },
  },
];

export default config;
