import baseConfig from "@tutly/eslint-config/react-internal";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    ignores: ["node_modules/**", "dist/**"],
  },
  {
    // Project's tsconfig sets `noUnusedLocals/Parameters: false` deliberately,
    // and the base ESLint rule misfires on TS-only type signatures (parameter
    // names in function types).
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-unused-vars": "off",
    },
  },
];

export default config;
