import baseConfig from "@tutly/eslint-config/react-internal";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    ignores: ["dist/**", "node_modules/**", "ios/**", "android/**"],
  },
  {
    // Project's tsconfig sets `noUnusedLocals/Parameters: false` deliberately;
    // the base ESLint rule misfires on TS type-signature parameter names.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-unused-vars": "off",
    },
  },
  {
    // Capacitor APIs are only allowed in apps/mobile/src/native/**.
    // This guards against a future shared package accidentally importing them.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/native/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@capacitor/*"],
              message:
                "Import Capacitor APIs only from src/native/* and re-export through that boundary.",
            },
          ],
        },
      ],
    },
  },
];

export default config;
