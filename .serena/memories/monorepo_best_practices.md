# Monorepo ベストプラクティス

## pnpm Workspace 管理

### ワークスペース構造

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 依存関係管理

```bash
# 特定ワークスペースに依存関係追加
pnpm add <package> --filter <workspace>

# ワークスペース間の依存関係
pnpm add @trading-viewer/shared --filter @trading-viewer/client

# 開発依存関係をルートに追加
pnpm add -D <package> -w
```

### スクリプト管理

```json
// root package.json
{
  "scripts": {
    "dev": "pnpm --parallel run dev",
    "build": "pnpm --recursive run build",
    "test": "pnpm --recursive run test",
    "lint": "pnpm --recursive run lint",
    "type-check": "pnpm --recursive run type-check"
  }
}
```

## パッケージ間の型共有

### packages/shared の活用

```typescript
// packages/shared/src/types/api.ts
export interface MarketDataRequest {
  symbol: string
  timeframe: string
  from?: number
  to?: number
}

export interface MarketDataResponse {
  symbol: string
  data: CandleData[]
  status: 'success' | 'error'
}
```

### 型の再エクスポート

```typescript
// packages/shared/src/index.ts
export * from './types/api'
export * from './types/chart'
export * from './utils/validation'
```

### 型安全な API クライアント

```typescript
// apps/client/src/api/client.ts
import type { MarketDataRequest, MarketDataResponse } from '@trading-viewer/shared'

const apiClient = {
  getMarketData: async (params: MarketDataRequest): Promise<MarketDataResponse> => {
    // 実装
  },
}
```

## 共有 UI コンポーネント

### packages/ui の構造

```
packages/ui/src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── index.ts
│   └── Input/
├── hooks/
│   ├── useDebounce.ts
│   └── useLocalStorage.ts
└── utils/
    └── classNames.ts
```

### コンポーネント設計原則

```typescript
// packages/ui/src/components/Button/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  onClick?: () => void
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  onClick,
}) => {
  // 実装
}
```

### テーマ対応

```typescript
// packages/ui/src/context/ThemeContext.tsx
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={`app ${theme}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}
```

## 設定ファイル管理

### TypeScript 設定の継承

```json
// tsconfig.json (root)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "paths": {
      "@trading-viewer/shared": ["./packages/shared/src"],
      "@trading-viewer/ui": ["./packages/ui/src"]
    }
  }
}
```

```json
// apps/client/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["DOM", "DOM.Iterable"]
  },
  "include": ["src/**/*"],
  "references": [{ "path": "../../packages/shared" }, { "path": "../../packages/ui" }]
}
```

### ESLint 設定の継承

```javascript
// .eslintrc.js (root)
module.exports = {
  root: true,
  extends: ['@typescript-eslint/recommended', 'prettier'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    // 共通ルール
  },
}
```

```javascript
// apps/client/.eslintrc.cjs
module.exports = {
  extends: ['../../.eslintrc.js'],
  env: {
    browser: true,
    es2020: true,
  },
  plugins: ['react-hooks', 'react-refresh'],
  rules: {
    // React 固有のルール
  },
}
```

## ビルド最適化

### Vite 設定 (クライアント)

```typescript
// apps/client/vite.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['lightweight-charts'],
        },
      },
    },
  },
})
```

### 段階的ビルド

```bash
# 依存関係順にビルド
pnpm --filter packages/shared build
pnpm --filter packages/ui build
pnpm --filter apps/server build
pnpm --filter apps/client build
```

## 開発効率化

### 並行開発サーバー

```json
// root package.json
{
  "scripts": {
    "dev": "concurrently \"pnpm --filter @trading-viewer/server dev\" \"pnpm --filter @trading-viewer/client dev\"",
    "dev:server": "pnpm --filter @trading-viewer/server dev",
    "dev:client": "pnpm --filter @trading-viewer/client dev"
  }
}
```

### ホットリロード対応

```typescript
// apps/client で packages/shared の変更を監視
export default defineConfig({
  server: {
    fs: {
      allow: ['..'],
    },
  },
  optimizeDeps: {
    include: ['@trading-viewer/shared', '@trading-viewer/ui'],
  },
})
```

## デプロイメント戦略

### Docker マルチステージビルド

```dockerfile
# Dockerfile (root)
FROM node:18-alpine AS base
RUN npm install -g pnpm

# 依存関係インストール
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/*/package.json ./packages/*/
COPY apps/*/package.json ./apps/*/
RUN pnpm install --frozen-lockfile

# ビルド
FROM base AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm build

# Server 用イメージ
FROM node:18-alpine AS server
WORKDIR /app
COPY --from=builder /app/apps/server/dist ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 8000
CMD ["node", "index.js"]

# Client 用イメージ (nginx)
FROM nginx:alpine AS client
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

## 継続的インテグレーション

### GitHub Actions 設定

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm test
      - run: pnpm build
```

### テスト戦略

```bash
# パッケージ別テスト実行
pnpm --filter packages/shared test
pnpm --filter packages/ui test
pnpm --filter apps/server test
pnpm --filter apps/client test

# 統合テスト
pnpm test:integration

# E2E テスト
pnpm test:e2e
```

## トラブルシューティング

### よくある問題と解決策

#### 依存関係の重複

```bash
# node_modules の重複チェック
pnpm list --depth=0

# 重複解決
pnpm dedupe
```

#### 型エラー

```bash
# 型定義の再生成
pnpm --filter packages/shared build
pnpm type-check
```

#### キャッシュ問題

```bash
# pnpm キャッシュクリア
pnpm store prune

# node_modules 再構築
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

## セキュリティ考慮事項

### 依存関係監査

```bash
# 脆弱性チェック
pnpm audit

# 自動修正
pnpm audit --fix
```

### パッケージ公開制限

```json
// packages/shared/package.json
{
  "private": true,
  "publishConfig": {
    "access": "restricted"
  }
}
```
