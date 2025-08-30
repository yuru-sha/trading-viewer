module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  globals: {
    describe: 'readonly',
    it: 'readonly',
    expect: 'readonly',
    beforeEach: 'readonly',
    afterEach: 'readonly',
    beforeAll: 'readonly',
    afterAll: 'readonly'
  },
  extends: [
    'eslint:recommended',
    "prettier"
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'no-console': 'off', // Server logging is acceptable
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off', // Temporarily disabled
    '@typescript-eslint/no-explicit-any': 'off', // Temporarily disabled
    'prefer-const': 'warn',
    'no-var': 'error',
    'no-undef': 'off', // Temporarily disabled for NodeJS globals
    'no-useless-escape': 'error',
    'no-control-regex': 'warn',
    'no-case-declarations': 'error'
  },
  ignorePatterns: ['dist', 'node_modules']
}