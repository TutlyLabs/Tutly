module.exports = {
  testEnvironment: "@happy-dom/jest-environment",
  rootDir: ".",
  roots: ["<rootDir>"],
  testMatch: ["**/*.(test|spec).(ts|tsx|js|jsx)"],
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": "babel-jest",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  modulePathIgnorePatterns: ["<rootDir>/node_modules"],
  setupFiles: ["<rootDir>/jest.setup.js"],
  testTimeout: 15000,
  maxWorkers: 1,
  cache: false,
  verbose: false,
  bail: false,
};
