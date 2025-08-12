# アーキテクチャパターン・設計指針

## 全体アーキテクチャ

### Monorepo パターン

- **apps/client**: React フロントエンドアプリケーション
- **apps/server**: Express バックエンドアプリケーション
- **packages/shared**: 共有型定義・ユーティリティ
- **packages/ui**: 再利用可能 UI コンポーネント

### 依存関係の方向

```
apps/client  ─┐
              ├─→ packages/shared
apps/server  ─┘   packages/ui ─┘
```

## フロントエンド設計パターン

### コンポーネント設計

- **Container/Presentational パターン**
- **Compound Component パターン** (複雑な UI)
- **Render Props パターン** (ロジック再利用)

### 状態管理

- **Context API** - グローバル状態
- **Custom Hooks** - ロジック抽象化
- **Reducer パターン** - 複雑な状態更新

### データフロー

```
API Client → Custom Hook → Component → UI
     ↓
Cache/Local State
```

### エラーハンドリング

```typescript
// Error Boundary パターン
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

// Result パターン
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E }
```

## バックエンド設計パターン

### Layered Architecture

```
Controllers (HTTP層)
     ↓
Services (ビジネスロジック層)
     ↓
Repositories (データアクセス層)
     ↓
Database (PostgreSQL + Prisma)
```

### Dependency Injection

```typescript
// Service の注入
class MarketDataController {
  constructor(
    private finnhubService: FinnhubService,
    private cacheService: CacheService
  ) {}
}
```

### Repository パターン

```typescript
interface MarketDataRepository {
  getCachedCandles(symbol: string, from: number, to: number): Promise<Candle[]>
  cacheCandles(symbol: string, candles: Candle[]): Promise<void>
}
```

## データアクセスパターン

### Cache-Aside パターン

```typescript
async getMarketData(symbol: string): Promise<MarketData> {
  // 1. キャッシュ確認
  const cached = await cache.get(symbol)
  if (cached) return cached

  // 2. API から取得
  const data = await finnhubApi.getQuote(symbol)

  // 3. キャッシュに保存
  await cache.set(symbol, data)
  return data
}
```

### Optimistic Updates

```typescript
// UI を即座に更新、バックグラウンドで同期
const optimisticUpdate = async (newData: ChartData) => {
  // UI 即座更新
  setChartData(newData)

  try {
    // サーバー同期
    await api.updateChartData(newData)
  } catch (error) {
    // エラー時は元に戻す
    setChartData(previousData)
    showErrorMessage(error)
  }
}
```

## リアルタイム通信パターン

### WebSocket Connection Management

```typescript
class WebSocketManager {
  private connection: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect() {
    /* 接続管理 */
  }
  reconnect() {
    /* 再接続ロジック */
  }
  subscribe(symbol: string) {
    /* 購読管理 */
  }
}
```

### Event-Driven Architecture

```typescript
// イベントベースの通信
interface MarketDataEvent {
  type: 'quote' | 'candle' | 'error'
  symbol: string
  data: any
  timestamp: number
}
```

## パフォーマンス最適化パターン

### データ仮想化

```typescript
// 大量データの効率的表示
const VirtualizedChart = ({ data }: { data: ChartData[] }) => {
  const visibleData = useMemo(() => {
    const { startIndex, endIndex } = getVisibleRange()
    return data.slice(startIndex, endIndex)
  }, [data, viewport])

  return <Chart data={visibleData} />
}
```

### Lazy Loading

```typescript
// コンポーネントの遅延読み込み
const LazyChart = lazy(() => import('./Chart'))
const LazyIndicators = lazy(() => import('./TechnicalIndicators'))
```

### Memoization

```typescript
// 重い計算の結果キャッシュ
const expensiveCalculation = useMemo(() => {
  return calculateTechnicalIndicator(chartData, params)
}, [chartData, params])
```

## エラーハンドリングパターン

### Circuit Breaker パターン

```typescript
class CircuitBreaker {
  private failureCount = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open')
    }
    // 実行・状態管理
  }
}
```

### Retry with Exponential Backoff

```typescript
const retryWithBackoff = async <T>(fn: () => Promise<T>, maxAttempts: number = 3): Promise<T> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxAttempts) throw error
      await delay(Math.pow(2, attempt) * 1000) // 指数的バックオフ
    }
  }
  throw new Error('Max attempts reached')
}
```

## テストパターン

### Test Doubles

```typescript
// Mock Service
const mockFinnhubService: FinnhubService = {
  getQuote: jest.fn().mockResolvedValue(mockQuoteData),
  getCandles: jest.fn().mockResolvedValue(mockCandleData),
}
```

### Page Object Model (E2E)

```typescript
class ChartPage {
  async selectSymbol(symbol: string) {
    await page.fill('[data-testid=symbol-search]', symbol)
    await page.click(`[data-testid=symbol-${symbol}]`)
  }

  async changeTimeframe(timeframe: string) {
    await page.selectOption('[data-testid=timeframe-select]', timeframe)
  }
}
```

## セキュリティパターン

### Input Validation

```typescript
// Zod を使用したスキーマ検証
const SymbolRequestSchema = z.object({
  symbol: z.string().regex(/^[A-Z]{1,5}$/, 'Invalid symbol format'),
  timeframe: z.enum(['1', '5', '15', '30', '60', 'D', 'W', 'M']),
})
```

### Rate Limiting

```typescript
// Redis を使用したレート制限
const rateLimiter = new RateLimiter({
  keyType: 'ip',
  limit: 100,
  window: '1h',
})
```

## 設計原則

### SOLID Principles

- **Single Responsibility**: 各クラス・関数は単一の責任
- **Open/Closed**: 拡張に対して開いている、修正に対して閉じている
- **Liskov Substitution**: 派生型は基底型で置換可能
- **Interface Segregation**: 不要な依存関係を避ける
- **Dependency Inversion**: 具象ではなく抽象に依存

### DRY (Don't Repeat Yourself)

- 共通ロジックは packages/shared に抽出
- UI コンポーネントは packages/ui で再利用
- ユーティリティ関数の統一

### KISS (Keep It Simple, Stupid)

- 過度な抽象化を避ける
- 明確で読みやすいコード
- 必要最小限の複雑さ
