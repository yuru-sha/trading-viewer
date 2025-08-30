# UI アイコン ガイドライン

## アイコンライブラリ

**統一ルール**: アプリ全体で `lucide-react` ライブラリを使用する

- すべてのアイコンは `lucide-react` パッケージから import する
- SVG の手書きや他のアイコンライブラリは使用しない
- 一貫性のあるアイコンセットを維持する

## 使用例

```typescript
import { Eye, EyeOff, Trash2 } from 'lucide-react'

// 表示/非表示切り替え
{visible ? <Eye size={16} /> : <EyeOff size={16} />}

// 削除ボタン
<Trash2 size={16} />
```

## 推奨サイズ

- 小さいボタン: `size={14}` または `size={16}`
- 通常のボタン: `size={20}` または `size={24}`
- 大きいアイコン: `size={32}` 以上

## カラー

TailwindCSS のテキストカラークラスを使用して色を制御する
