module.exports = {
  extends: ['../../.eslintrc.js'],
  env: {
    node: true,
    es2022: true
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    'no-console': 'off', // Server logging is acceptable
    '@typescript-eslint/no-explicit-any': 'warn'
  },
  ignorePatterns: ['dist']
}