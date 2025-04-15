module.exports = {
  env: {
    node: true,
    es2021: true
  },
  extends: "eslint:recommended",
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module"
  },
  rules: {
    "no-unused-vars": "warn",
    "no-undef": "error"
  },
  globals: {
    process: true,
    __dirname: true
  }
};