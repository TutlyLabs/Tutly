/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["@tutly/eslint-config/server.js"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
};
