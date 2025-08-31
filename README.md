# TradingViewer

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/yuru-sha/trading-viewer)

TradingViewer は、TradingView のクローンとして開発された現代的な Web ベースの金融チャートアプリケーションです。リアルタイム市場データの可視化、テクニカル分析ツール、インタラクティブなチャート機能をトレーダーや投資家に提供します。

## 特徴

### 📈 チャート機能

- **ローソク足チャート** - カスタマイズ可能な色設定
- **ライン・エリアチャート** - シンプルな価格追跡とグラデーション塗りつぶし
- **ボリューム表示** - 出来高バーとインジケーター
- **マルチタイムフレーム分析** - 1m, 5m, 15m, 1h, 4h, 1D, 1W, 1M

### 🛠️ トレーディングツール

- **描画ツール** - トレンドライン、サポート・レジスタンスレベル、フィボナッチリトレースメント
- **アラート機能** - 価格アラートとテクニカルインジケーター通知

### 📊 テクニカル分析

- **インジケーター** - SMA, EMA, RSI, MACD, ボリンジャーバンド、出来高
- **オーバーレイ** - サポート・レジスタンス検出、トレンドライン
- **チャートパターン** - 自動パターン認識（計画中）
- **カスタムインジケーター** - ユーザー定義の数式（計画中）

## 技術スタック

- **フロントエンド**: React 18, TypeScript, Vite, TailwindCSS, TradingView Lightweight Charts
- **バックエンド**: Express.js, TypeScript (ESM), Prisma ORM, PostgreSQL
- **外部 API**: Yahoo Finance API
- **リアルタイム**: WebSocket 接続によるライブデータストリーミング
- **テスト**: Vitest, React Testing Library, Playwright

## インストール

### 前提条件

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL データベース

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/yuru-sha/trading-viewer.git
cd trading-viewer

# 依存関係をインストール
pnpm install

# 環境変数を設定
cp .env.example .env.local
# .env.local を適切な値で編集

# データベースをセットアップ
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 開発サーバーを起動
pnpm dev
```

### アクセス

- **フロントエンド**: http://localhost:3000
- **バックエンド API**: http://localhost:8000
- **データベース管理**: `pnpm db:studio`

## 開発コマンド

### 基本開発

```bash
# 両方のアプリケーションを開発モードで起動
pnpm dev

# 個別にアプリケーションを起動
pnpm dev:client  # React dev server on :3000
pnpm dev:server  # Express server on :8000

# 全パッケージをビルド
pnpm build

# 全テストを実行
pnpm test
```

### コード品質

```bash
# リントとフォーマット
pnpm lint
pnpm lint:fix
pnpm format
pnpm type-check

# 包括的な品質チェック
pnpm quality-check
# 注: 現在、サーバーの単体テストにおけるモジュール解決の問題により、このコマンドは失敗する可能性があります。
# 回避策として、`pnpm lint`、`pnpm type-check`、`pnpm test:unit`を個別にお使いください。
```

### データベース操作

```bash
pnpm db:generate  # Prisma クライアント生成
pnpm db:migrate   # データベースマイグレーション実行
pnpm db:seed      # サンプルデータでシード
pnpm db:studio    # Prisma Studio を開く
```

### 分析とモニタリング

```bash
# セキュリティと依存関係分析
pnpm security:audit
pnpm security:scan

# バンドルとパフォーマンス分析
pnpm analyze:bundle
pnpm analyze:bundle:size

# 依存関係分析
pnpm deps:check     # 循環依存関係チェック
pnpm deps:analyze   # 包括的な依存関係分析
```

## プロジェクト構造

```
trading-viewer/
├── apps/
│   ├── client/          # React フロントエンドアプリケーション
│   └── server/          # Express バックエンド API
├── packages/
│   ├── shared/          # 共有タイプとユーティリティ
│   └── ui/              # 再利用可能な React UI コンポーネント
├── prisma/              # データベーススキーマとマイグレーション
├── scripts/             # ビルドとデプロイスクリプト
└── docker/              # Docker 設定
```

## ライセンス

GNU Affero General Public License v3.0 - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 貢献

プロジェクトへの貢献を歓迎します。Pull Request を作成する前に、以下を実行してください：

```bash
pnpm quality-check  # リント、タイプチェック、テストを実行
```

## サポート

問題や質問がある場合は、GitHub Issues でお知らせください。
