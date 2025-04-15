module.exports = {
    env: {
      node: true,
      es2021: true
    },
    parserOptions: {
      ecmaVersion: 2021,
      sourceType: "commonjs"
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error"
    }
  };