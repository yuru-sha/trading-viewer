# Dependency Injection (DI) システム

## 概要

Evidence-First 設計原則に基づいた InversifyJS による依存性注入システム。

## 主要機能

### 1. 型安全な依存性注入

- インターフェース分離原則の適用
- 依存性逆転の原則
- TypeScript による完全な型安全性

### 2. テストフレンドリー設計

- モッキング専用の型定義
- 独立したテストコンテナ
- 簡単なモック制御とクリーンアップ

### 3. 段階的移行サポート

- 既存コードとの互換性維持
- 遅延バインディングによる循環依存回避
- サービスロケーターパターンのサポート

## 使用方法

### サービス定義

```typescript
import { injectable, inject } from 'inversify'
import { TYPES, type ILoggerService } from '../infrastructure/di/index.js'

@injectable()
export class MyService {
  constructor(@inject(TYPES.LoggerService) private logger: ILoggerService) {}

  async doSomething(): Promise<void> {
    this.logger.info('Doing something...')
  }
}
```

### テストでのモッキング

```typescript
import {
  setupTestContainer,
  teardownTestContainer,
  createMockLoggerService,
  TYPES,
  type MockedLoggerService,
} from '../infrastructure/di/index.js'

describe('MyService', () => {
  let container: TestContainerManager
  let mockLogger: MockedLoggerService

  beforeEach(() => {
    container = setupTestContainer()
    mockLogger = createMockLoggerService()
    container.mock(TYPES.LoggerService, mockLogger)
  })

  afterEach(() => {
    teardownTestContainer(container)
  })

  it('should log message', async () => {
    const service = new MyService(container.get(TYPES.LoggerService))
    await service.doSomething()

    expect(mockLogger.info).toHaveBeenCalledWith('Doing something...')
  })
})
```

## ディレクトリ構成

```
src/infrastructure/di/
├── types.ts          # サービス識別子
├── interfaces.ts     # サービスインターフェース
├── container.ts      # DIコンテナ実装
├── testing.ts        # テスト用ユーティリティ
└── index.ts          # エクスポート
```

## 実装の進捗状況

### ✅ 完了

- [x] 基本的な DI アーキテクチャ
- [x] 型安全なインターフェース定義
- [x] テスト用モッキングシステム
- [x] 段階的移行サポート
- [x] ドキュメントと使用例

### 🔄 段階的移行中

- [ ] 既存サービスの DI 対応
- [ ] ルーティング層での DI 活用
- [ ] ミドルウェアでの DI 統合

## 注意事項

1. **reflect-metadata の必須**
   - 各ファイルの先頭で `import 'reflect-metadata'` が必要

2. **@injectable() デコレータの必須**
   - DI で管理されるクラスには必須

3. **循環依存の回避**
   - サービス設計時に依存関係を明確に

4. **テスト分離**
   - 各テストで独立したコンテナを使用

## Evidence-First 設計原則

本 DI システムは以下の Evidence-First 原則に基づいて実装：

1. **公式ガイドライン準拠**: InversifyJS の公式ベストプラクティス
2. **実証済みパターン**: 依存性逆転の原則、インターフェース分離の原則
3. **型安全性**: TypeScript による完全な型チェック
4. **テスタビリティ**: モッキングフレンドリーな設計
5. **保守性**: 明確な責任分離と疎結合

## パフォーマンス考慮

- シングルトンスコープによる効率的なリソース管理
- 遅延バインディングによる初期化コストの削減
- WeakRef を使用したメモリリーク防止

## トラブルシューティング

### よくある問題

1. **"No bindings found" エラー**
   - サービスが正しく登録されているか確認
   - @injectable() デコレータが適用されているか確認

2. **循環依存エラー**
   - サービス間の依存関係を見直し
   - 必要に応じてインターフェース分離を実施

3. **reflect-metadata エラー**
   - ファイル先頭で import されているか確認
   - tsconfig.json で emitDecoratorMetadata が有効か確認

## 今後の改善予定

- [ ] 自動バインディング機能の強化
- [ ] パフォーマンス監視機能の追加
- [ ] より詳細なエラーメッセージの提供
- [ ] 設定ファイルによるバインディング定義
