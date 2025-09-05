module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:react/recommended',
    "prettier"
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'src/__tests__/**/*', 'e2e/**/*', '**/*.test.*', '**/*.spec.*'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['react-refresh', 'jsx-a11y', 'react'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react-refresh/only-export-components': 'off',
    '@typescript-eslint/no-unused-vars': ['off', { argsIgnorePattern: '^_' }],
    'react-hooks/exhaustive-deps': 'off',
    'react/react-in-jsx-scope': 'off', // React 17+では不要
    'react/prop-types': 'off', // TypeScript で型チェックしているため無効
    'jsx-a11y/no-autofocus': 'off', // 自動フォーカスは警告レベル
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    '@typescript-eslint/no-explicit-any': 'off', // 一時的に警告レベル（段階的移行）
    '@typescript-eslint/ban-ts-comment': 'error', // @ts-ignore 等の使用を禁止
    'no-console': 'error',
  },
}