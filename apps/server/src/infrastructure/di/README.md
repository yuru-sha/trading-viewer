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
import { TYPES } from '../infrastructure/di/types.js'
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository'
import type { UserRepository } from '../repositories/UserRepository'

@injectable()
export class AuthService {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: UserRepository,
    @inject(TYPES.RefreshTokenRepository) private refreshTokenRepository: IRefreshTokenRepository
  ) {}

  async login(credentials: LoginRequest): Promise<AuthResult> {
    // 実際の認証ロジック
    const user = await this.userRepository.findByEmail(credentials.email)
    // ...
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
- [x] 認証システムの完全移行（AuthService, UserRepository, RefreshTokenRepository）
- [x] カスタムDIシステムの廃止・削除（`/containers/` ディレクトリ）
- [x] 段階的移行サポート
- [x] ドキュメントと使用例
- [x] プロダクション環境での動作確認

### 🔄 段階的移行中

- [ ] 残りのサービスの DI 対応（YahooFinanceService, WebSocketService等）
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

## 移行実績

### 移行済みサービス

1. **AuthService** - 認証・認可の中核サービス
   - JWT トークン生成・検証
   - パスワードハッシュ化
   - ログイン試行制限

2. **UserRepository** - ユーザーデータ管理
   - Prisma ORM との連携
   - ユーザー CRUD 操作
   - メール検索、リセットトークン管理

3. **RefreshTokenRepository** - リフレッシュトークン管理
   - トークンの生成・検証・無効化
   - 有効期限管理
   - ユーザー別トークン管理

### 移行による効果

- **型安全性の向上**: コンパイル時の依存関係チェック
- **テスタビリティの向上**: モック注入による単体テスト容易化
- **保守性の向上**: インターフェース分離による疎結合設計
- **一貫性の確保**: 統一された DI パターンの採用

## 今後の改善予定

- [ ] 残りサービスの段階的移行（YahooFinanceService 優先）
- [ ] 自動バインディング機能の強化
- [ ] パフォーマンス監視機能の追加
- [ ] より詳細なエラーメッセージの提供
