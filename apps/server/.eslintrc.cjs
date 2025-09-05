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
    'no-console': 'error',
    '@typescript-eslint/no-unused-vars': ['off', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      destructuredArrayIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-explicit-any': 'off',
    'prefer-const': 'warn',
    'no-var': 'error',
    'no-undef': 'off',
    'no-useless-escape': 'error',
    'no-control-regex': 'warn',
    'no-case-declarations': 'error',
    'no-unused-vars': 'off', // Use TypeScript version instead
    'no-redeclare': 'off' // Use TypeScript version instead
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.ts', '**/*.test.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'off'
      }
    }
  ],
  ignorePatterns: ['dist', 'node_modules']
}