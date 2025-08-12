# 開発環境・システム情報

## システム環境

- **OS**: Darwin (macOS) 24.5.0
- **Node.js**: /opt/homebrew/bin/node
- **pnpm**: /opt/homebrew/bin/pnpm (パッケージ管理)
- **Docker**: /usr/local/bin/docker
- **Git**: /usr/bin/git

## プロジェクト構造 (Monorepo)

```
trading-viewer/
├── apps/
│   ├── client/          # React + Vite + TypeScript フロントエンド
│   └── server/          # Express + TypeScript バックエンド
├── packages/
│   ├── shared/          # 共有型定義・ユーティリティ
│   └── ui/              # 共有UIコンポーネント
├── prisma/              # データベーススキーマ・マイグレーション
├── docker/              # Docker設定ファイル
├── pnpm-workspace.yaml  # pnpmワークスペース設定
└── package.json         # ルートパッケージ設定
```

## 開発ツール設定

### Package Manager

- **pnpm workspace** による monorepo 管理
- ワークスペース間の依存関係管理
- 効率的なnode_modules共有

### 型安全性

- **TypeScript** 全プロジェクト採用
- 厳格な型チェック設定
- packages/shared による型の共有

### コード品質

- **ESLint** - 構文・スタイルチェック
- **Prettier** - 自動フォーマット
- **Husky** - Git hooks によるコミット前チェック

### テスト環境

- **Jest** - 単体・統合テスト
- **React Testing Library** - React コンポーネントテスト
- **Supertest** - API エンドポイントテスト
- **Playwright** - E2E テスト
- **Artillery.js** - 負荷テスト

### データベース

- **PostgreSQL** - 本番データベース
- **Prisma ORM** - 型安全なデータベースアクセス
- **Database migrations** - スキーマバージョン管理

### 開発サーバー

- **Vite** - 高速フロントエンド開発サーバー
- **Express** - バックエンド API サーバー
- **Hot Module Replacement** - 開発時のライブリロード

## 外部サービス連携

- **Finnhub API** - リアルタイム・履歴市場データ
- **TradingView Lightweight Charts** - チャート描画ライブラリ
- **WebSocket** - リアルタイム通信

## パフォーマンス・最適化

- **Data virtualization** - 大量データ処理
- **Lazy loading** - コンポーネント遅延読み込み
- **Service Worker** - オフライン機能
- **Bundle analyzer** - バンドルサイズ最適化

## セキュリティ

- **CORS** 設定
- **Rate limiting** - API レート制限
- **Input validation** - リクエスト検証
- **Environment variables** - 機密情報管理

## CI/CD

- **GitHub Actions** - 継続的インテグレーション
- **Docker** コンテナ化
- **Automated testing** - 自動テスト実行
- **Code coverage** - テストカバレッジ計測

## macOS 固有の設定

### ファイル検索

```bash
# macOS の find コマンド
find . -name "*.ts" -o -name "*.tsx"

# テキスト検索
grep -r "pattern" --include="*.ts" --include="*.tsx" .
```

### プロセス管理

```bash
# Node.js プロセス確認
ps aux | grep node

# ポート使用状況
lsof -i :3000
lsof -i :8000
```

### メモリ・ディスク使用量

```bash
# ディスク使用量
du -sh .

# システムメモリ
top -l 1 | grep -E "^CPU|^Phys"
```

## 推奨開発フロー

### 1. 初期セットアップ

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
```

### 2. 開発開始

```bash
# 並行開発サーバー起動
pnpm dev
```

### 3. 品質チェック

```bash
pnpm lint
pnpm type-check
pnpm test
```

### 4. ビルド確認

```bash
pnpm build
```
