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
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'react-hooks/exhaustive-deps': 'warn',
    'react/react-in-jsx-scope': 'off', // React 17+では不要
    'react/prop-types': 'off', // TypeScript で型チェックしているため無効
    'jsx-a11y/no-autofocus': 'warn', // 自動フォーカスは警告レベル
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/no-static-element-interactions': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn', // 一時的に警告レベル（段階的移行）
    '@typescript-eslint/ban-ts-comment': 'error', // @ts-ignore 等の使用を禁止
  },
}