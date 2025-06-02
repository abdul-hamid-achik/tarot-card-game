module.exports = {
  root: true,
  env: { node: true, es2022: true },
  ignorePatterns: ["dist", "node_modules"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",

    "prettier"
  ],

  rules: {},
};