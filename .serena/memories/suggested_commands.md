# 推奨コマンド一覧

## パッケージ管理

```bash
# 依存関係のインストール
pnpm install

# 特定のワークスペースに依存関係を追加
pnpm add <package> --filter <workspace>

# 開発依存関係の追加
pnpm add -D <package>

# 依存関係の更新
pnpm update
```

## 開発サーバー

```bash
# クライアントアプリケーション開発サーバー起動
pnpm --filter @trading-viewer/client dev

# サーバーアプリケーション開発サーバー起動
pnpm --filter @trading-viewer/server dev

# 全ての開発サーバーを並行起動
pnpm dev
```

## ビルド・型チェック

```bash
# 本番ビルド
pnpm build

# 型チェック実行
pnpm type-check

# 特定ワークスペースの型チェック
pnpm --filter @trading-viewer/client type-check
```

## テスト実行

```bash
# 全テスト実行
pnpm test

# 単体テスト実行
pnpm test:unit

# 統合テスト実行
pnpm test:integration

# E2E テスト実行
pnpm test:e2e

# テストウォッチモード
pnpm test:watch
```

## コード品質

```bash
# ESLint チェック
pnpm lint

# ESLint 自動修正
pnpm lint:fix

# Prettier フォーマット
pnpm format

# 全品質チェック実行
pnpm quality-check
```

## データベース関連

```bash
# Prisma マイグレーション実行
pnpm db:migrate

# Prisma スキーマ生成
pnpm db:generate

# データベースシード実行
pnpm db:seed

# データベースリセット
pnpm db:reset

# Prisma Studio 起動
pnpm db:studio
```

## Docker 関連

```bash
# 開発環境起動
docker-compose up -d

# 本番環境ビルド・起動
docker-compose -f docker-compose.prod.yml up -d

# コンテナ停止・削除
docker-compose down
```

## ユーティリティ

```bash
# プロジェクト全体のクリーンアップ
pnpm clean

# node_modules 削除・再インストール
pnpm reset

# バンドルサイズ分析
pnpm analyze

# パフォーマンステスト実行
pnpm perf:test
```

## Git 関連 (Darwin システム用)

```bash
# ブランチ一覧表示
git branch -a

# リモート同期
git fetch --all

# コミット履歴確認
git log --oneline --graph --decorate

# 差分確認
git diff --color=always

# ファイル検索 (macOS)
find . -name "*.ts" -o -name "*.tsx" | head -20

# テキスト検索 (macOS)
grep -r "pattern" --include="*.ts" --include="*.tsx" .
```

## システムユーティリティ (Darwin)

```bash
# ディレクトリ一覧
ls -la

# プロセス確認
ps aux | grep node

# ポート使用状況確認
lsof -i :3000

# ディスク使用量
du -sh .

# メモリ使用量
top -l 1 | grep -E "^CPU|^Phys"
```
