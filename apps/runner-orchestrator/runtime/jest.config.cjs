module.exports = {
  testEnvironment: "jsdom",
  preset: "ts-jest",
  rootDir: ".",
  roots: ["<rootDir>"],
  testMatch: ["**/*.(test|spec).(ts|tsx|js|jsx)"],
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.json",
        diagnostics: false,
      },
    ],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  modulePathIgnorePatterns: ["<rootDir>/node_modules"],
  testTimeout: 15000,
  maxWorkers: 1,
  cache: false,
  verbose: false,
  bail: false,
};
