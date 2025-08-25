# コードスタイル・規約

## 基本原則

- **TypeScript** を全プロジェクトで使用
- **関数型プログラミング** のアプローチを優先
- **明確で意図が伝わる命名** を心がける
- **単一責任の原則** を遵守

## プロジェクト構造規約

### Monorepo 構造

```
/
├── apps/
│   ├── client/          # React フロントエンドアプリケーション
│   └── server/          # Express バックエンドアプリケーション
├── packages/
│   ├── shared/          # 共有型定義・ユーティリティ
│   └── ui/              # 共有 UI コンポーネント
├── prisma/              # データベーススキーマ・マイグレーション
└── docker/              # Docker 設定ファイル
```

### ファイル命名規約

- **コンポーネント**: PascalCase (例: `ChartContainer.tsx`)
- **ページコンポーネント**: PascalCase (例: `Dashboard.tsx`)
- **ユーティリティ**: camelCase (例: `apiClient.ts`)
- **フック**: camelCase with `use` prefix (例: `useWebSocket.tsx`)
- **サービス**: camelCase (例: `finnhubService.ts`)
- **型定義**: PascalCase (例: `ChartData.ts`)

## TypeScript 規約

### インターフェース定義

```typescript
// 良い例
interface ChartData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

// API レスポンス型
interface ApiResponse<T> {
  data: T
  status: 'success' | 'error'
  message?: string
}
```

### 関数定義

```typescript
// Arrow function を優先
const fetchMarketData = async (symbol: string): Promise<ChartData[]> => {
  // 実装
}

// 型注釈は明示的に
const calculateSMA = (data: number[], period: number): number[] => {
  // 実装
}
```

### エラーハンドリング

```typescript
// Result パターンの使用
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E }

// カスタムエラー型
enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  INVALID_SYMBOL = 'INVALID_SYMBOL',
}
```

## React コンポーネント規約

### コンポーネント構造

```typescript
// 良い例
interface ChartContainerProps {
  symbol: string
  timeframe: string
  onDataLoad?: (data: ChartData[]) => void
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  symbol,
  timeframe,
  onDataLoad
}) => {
  // フック呼び出し
  const { data, loading, error } = useMarketData(symbol, timeframe)

  // 副作用
  useEffect(() => {
    if (data && onDataLoad) {
      onDataLoad(data)
    }
  }, [data, onDataLoad])

  // 早期リターン
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />

  // メインレンダリング
  return (
    <div className="chart-container">
      {/* JSX */}
    </div>
  )
}
```

### カスタムフック

```typescript
// useで始める
export const useWebSocket = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [connectionState, setConnectionState] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('disconnected')

  // 実装...

  return { socket, connectionState }
}
```

## CSS/TailwindCSS 規約

### クラス名の順序

```typescript
// Tailwind クラスは機能順に配置
<div className="
  relative flex items-center justify-center
  w-full h-64
  p-4 m-2
  bg-white border border-gray-200 rounded-lg
  shadow-sm hover:shadow-md
  transition-shadow duration-200
">
```

### レスポンシブ設計

```typescript
// モバイルファースト
<div className="
  w-full h-48
  md:w-1/2 md:h-64
  lg:w-1/3 lg:h-80
">
```

## Backend (Express) 規約

### API ルート構造

```typescript
// routes/marketData.ts
import { Router } from 'express'
import { validateRequest } from '../middleware/validation'
import { MarketDataController } from '../controllers/MarketDataController'

const router = Router()

router.get('/quote/:symbol', validateRequest, MarketDataController.getQuote)

export { router as marketDataRoutes }
```

### サービス層

```typescript
// services/finnhubService.ts
export class FinnhubService {
  private readonly apiKey: string
  private readonly baseUrl = 'https://finnhub.io/api/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async getQuote(symbol: string): Promise<Result<Quote, FinnhubError>> {
    // 実装
  }
}
```

## 共有パッケージ規約

### packages/shared の構造

```
packages/shared/src/
├── types/
│   ├── api.ts           # API契約型
│   ├── chart.ts         # チャート関連型
│   └── index.ts         # 型エクスポート
├── utils/
│   ├── validation.ts    # バリデーション関数
│   ├── formatters.ts    # フォーマッタ関数
│   └── index.ts         # ユーティリティエクスポート
└── constants/
    └── index.ts         # アプリケーション定数
```

## コメント・ドキュメント規約

### JSDoc の使用

```typescript
/**
 * 移動平均を計算します
 * @param data 価格データ配列
 * @param period 移動平均の期間
 * @returns 移動平均値の配列
 */
export const calculateSMA = (data: number[], period: number): number[] => {
  // 実装
}
```

### インラインコメント

```typescript
// 複雑なロジックにのみコメント
const isValidTimeframe = (timeframe: string): boolean => {
  // Finnhub API でサポートされている時間軸のみ許可
  return ['1', '5', '15', '30', '60', 'D', 'W', 'M'].includes(timeframe)
}
```

## テスト規約

### ファイル配置

```
src/
├── components/
│   ├── Chart.tsx
│   └── __tests__/
│       └── Chart.test.tsx
├── services/
│   ├── finnhubService.ts
│   └── __tests__/
│       └── finnhubService.test.ts
```

### テスト命名

```typescript
describe('FinnhubService', () => {
  describe('getQuote', () => {
    it('should return quote data for valid symbol', async () => {
      // テスト実装
    })

    it('should throw error for invalid symbol', async () => {
      // テスト実装
    })
  })
})
```
