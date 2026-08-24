module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: { ie: "11" },
        loose: true,
        modules: "commonjs",
      },
    ],
    ["@babel/preset-typescript", { allowDeclareFields: true }],
    ["@babel/preset-react", { runtime: "automatic" }],
  ],
};
