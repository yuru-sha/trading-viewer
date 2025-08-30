# TradingViewer アイコンインベントリ

> **アイコン使用方針**:
> UIでのアイコン表示は、`packages/ui`の`Icon`コンポーネント（Lucide Reactベース）への移行を進めています。しかし、現状では一部のレガシーコンポーネントで絵文字が引き続き使用されており、混在した状態になっています。
>
> - **新規開発**: 新しいUIコンポーネントでは、必ず`Icon`コンポーネントを使用してください。
> - **ログ出力**: サーバーサイドのログやCI/CDの出力では、引き続き視認性のために絵文字を使用します。

プロジェクト全体で使用されている絵文字、Lucide React アイコン、SVG アイコンの総合一覧です。

## 🎨 絵文字

### サーバー側（ログ出力）

- `🔍` - デバッグ・調査
- `🚀` - サーバー起動
- `📊` - API エンドポイント
- `🌐` - WebSocket
- `❤️` - ヘルスチェック
- `🗄️` - データベース
- `🛡️` - グレースフル・シャットダウン
- `✅` - 成功
- `⚠️` - 警告
- `🔒` - セキュリティ
- `🌍` - 環境
- `🔐` - JWT
- `🔄` - リフレッシュトークン
- `🧂` - BCrypt ソルト
- `📝` - プロダクション注意
- `🔧` - 環境設定
- `💾` - メモリストア
- `♾️` - パーマネント化

### クライアント側（UI 表示）

- `📊` - チャート・統計
- `📈` - トレード・上昇
- `📉` - 下降・損失
- `📦` - ETF ・パッケージ
- `⚡` - 高速・パフォーマンス
- `🎨` - スタイル・カラー
- `💡` - ヒント・アイデア
- `🔧` - 設定・ツール
- `⚙️` - 設定メニュー
- `🧠` - インテリジェンス
- `📏` - 測定・メトリクス
- `🔬` - 分析
- `⏸️` - 停止・失敗
- `⏱️` - タイミング・パフォーマンス
- `🗑️` - 削除

### CI/CD ・開発

- `🔄` - 循環依存チェック
- `🕸️` - 依存関係分析
- `🔒` - セキュリティ監査
- `🎭` - E2E テスト
- `🏗️` - ビルド
- `❌` - エラー・失敗
- `✔️` - 成功・完了
- `☸️` - Kubernetes
- `🗜️` - 圧縮
- `🎯` - ターゲット・分析
- `🎉` - 完了・祝福

## ⭐ Lucide React アイコン

### ナビゲーション・基本 UI

- `Home` - ホームページ
- `Menu` - メニュー表示
- `X` - 閉じる
- `ChevronLeft/Right/Up/Down` - 方向矢印
- `ArrowUp/Down/Left/Right` - 矢印

### アクション

- `Plus` - 追加
- `Minus` - 削除・減少
- `Edit` - 編集
- `Trash2` - 削除
- `Copy` - コピー
- `Download` - ダウンロード
- `Upload` - アップロード
- `RefreshCw` - リフレッシュ
- `Save` - 保存
- `Share` - シェア

### トレーディング・金融

- `BarChart3` - 棒グラフ
- `TrendingUp` - 上昇トレンド
- `TrendingDown` - 下降トレンド
- `Target` - ターゲット
- `Bell` - アラート
- `BellPlus` - アラート追加
- `Heart` - お気に入り・ウォッチリスト

### ユーザー・認証

- `User` - ユーザー
- `Users` - 複数ユーザー
- `LogIn` - ログイン
- `LogOut` - ログアウト

### ステータス・フィードバック

- `Loader` - ローディング
- `Loader2` - ローディング（アニメーション用）
- `CheckCircle` - 成功
- `XCircle` - エラー
- `AlertTriangle` - 警告
- `Info` - 情報

### 表示制御

- `Eye` - 表示
- `EyeOff` - 非表示
- `Maximize` - 最大化
- `Minimize` - 最小化

### メディア・制御

- `Play` - 再生
- `Pause` - 一時停止
- `Camera` - スナップショット

### 設定・ヘルプ

- `Settings` - 設定
- `HelpCircle` - ヘルプ
- `Search` - 検索

### テーマ

- `Sun` - ライトテーマ
- `Moon` - ダークテーマ

### チャート専用アイコン

- `Crosshair` - 十字線・カーソル
- `Palette` - カラーピッカー
- `ChartNoAxesGantt` - フィボナッチ・描画ツール
- `ChartNoAxesCombined` - エリアチャート
- `AlignHorizontalDistributeCenter` - ロウソク足
- `TrendingUpDown` - ラインチャート
- `Volume2` - ボリューム
- `Layers` - インジケーター・レイヤー

### パネル制御

- `PanelLeftClose` - サイドバーを隠す
- `PanelLeftOpen` - サイドバーを表示
- `PanelBottomClose` - フッターを隠す
- `PanelBottomOpen` - フッターを表示

### デバイス・その他

- `Smartphone` - モバイル
- `Monitor` - デスクトップ
- `Tablet` - タブレット
- `Keyboard` - キーボード
- `Database` - データベース
- `BookOpen` - ドキュメント
- `ExternalLink` - 外部リンク
- `Lock/Unlock` - ロック・セキュリティ
- `Zap` - 高速・電力

### エイリアス（共通名 → Lucide 名）

- `trending` → `TrendingUp`
- `delete` → `Trash2`
- `add` → `Plus`
- `trash` → `Trash2`
- `lock` → `Lock`
- `keyboard` → `Keyboard`
- `x` → `X`
- `down` → `ChevronDown`

## 🎯 SVG アイコン（インライン）

### 検索・ナビゲーション

```svg
<!-- 検索アイコン -->
<svg className='w-5 h-5 mr-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
</svg>

<!-- チェックマーク -->
<svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
  <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
</svg>

<!-- ドロップダウン矢印 -->
<svg className='w-3 h-3 ml-1' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M19 9l-7 7-7-7' />
</svg>
```

### エラー・警告

```svg
<!-- 警告アイコン -->
<svg className='h-5 w-5 text-yellow-400' fill='currentColor' viewBox='0 0 20 20'>
  <path fillRule='evenodd' d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
</svg>

<!-- エラーアイコン -->
<svg className='h-5 w-5 text-red-400' fill='currentColor' viewBox='0 0 20 20'>
  <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
</svg>
```

### チャート関連

```svg
<!-- トレンドライン -->
<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M7 7l10 10' />
</svg>

<!-- 水平線 -->
<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M5 12h14' />
</svg>

<!-- 長方形 -->
<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
  <rect x='3' y='6' width='18' height='12' strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' />
</svg>
```

### ローディング・スピナー

```svg
<!-- アニメーションスピナー -->
<svg className='w-4 h-4 animate-spin' fill='none' viewBox='0 0 24 24'>
  <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
  <path className='opacity-75' fill='currentColor' d='m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
</svg>
```

### チャート描画（MiniChart）

- ミニチャートの SVG パスライン
- リアルタイム価格チャートのライン描画

## 📋 使用統計

### Lucide React アイコン数: **53 個**

- 基本 UI: 15 個
- チャート関連: 12 個
- ステータス表示: 8 個
- ナビゲーション: 7 個
- ユーザー関連: 4 個
- テーマ: 2 個
- その他: 5 個

### 絵文字数: **35 個**

- サーバーログ: 20 個
- UI 表示: 10 個
- CI/CD: 5 個

### インライン SVG: **25+種類**

- 検索・ナビゲーション
- エラー・ステータス表示
- チャート描画ツール
- ローディング・アニメーション
- フォーム要素

## 🔧 最適化情報

### Tree-shaking 対応

- Lucide React アイコンはすべて Tree-shaking 対応
- バンドルサイズへの影響を最小限に抑制
- 未使用アイコンは自動的にバンドルから除外

### パフォーマンス

- アイコンコンポーネントは React.memo 最適化済み
- SVG アイコンはインライン化で HTTP リクエスト削減
- 条件付きレンダリングでパフォーマンス向上

### 一貫性

- 共通アイコンマッピングで統一された API
- エイリアス機能で開発者体験向上
- TypeScript 型定義で型安全性確保
