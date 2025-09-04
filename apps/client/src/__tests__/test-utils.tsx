import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppProvider } from '../context/AppContext'
import { vi, expect } from 'vitest'

// Mock ErrorProvider
const MockErrorProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid='mock-error-provider'>{children}</div>
}

// Mock useError hook
vi.mock('../context/ErrorContext', () => ({
  ErrorProvider: MockErrorProvider,
  useError: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
    showWarning: vi.fn(),
    clearError: vi.fn(),
  }),
  useErrorHandlers: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
    showWarning: vi.fn(),
    clearError: vi.fn(),
  }),
}))

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

// Create all providers wrapper
interface AllProvidersProps {
  children: React.ReactNode
  queryClient?: QueryClient | undefined
}

const AllProviders = ({ children, queryClient }: AllProvidersProps) => {
  const testQueryClient = queryClient || createTestQueryClient()

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <QueryClientProvider client={testQueryClient}>
        <MockErrorProvider>
          <AppProvider>{children}</AppProvider>
        </MockErrorProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    queryClient?: QueryClient
  }
): ReturnType<typeof render> => {
  const { queryClient, ...renderOptions } = options || {}

  return render(ui, {
    wrapper: props => <AllProviders {...props} queryClient={queryClient} />,
    ...renderOptions,
  })
}

// Test data generators
export const generateMockSymbol = (overrides: any = {}) => ({
  symbol: 'AAPL',
  description: 'Apple Inc.',
  displaySymbol: 'AAPL',
  type: 'Common Stock',
  ...overrides,
})

export const generateMockQuote = (symbol = 'AAPL', overrides: any = {}) => ({
  symbol,
  bid: 150.0,
  ask: 150.05,
  last: 150.02,
  volume: 1000000,
  change: 2.5,
  changePercent: 1.69,
  timestamp: Date.now(),
  ...overrides,
})

export const generateMockCandleData = (count = 100) => {
  const baseTime = Math.floor(Date.now() / 1000) - count * 86400 // count days ago

  return Array.from({ length: count }, (_, i) => {
    const time = baseTime + i * 86400
    const open = 100 + Math.random() * 50
    const close = open + (Math.random() - 0.5) * 10
    const high = Math.max(open, close) + Math.random() * 5
    const low = Math.min(open, close) - Math.random() * 5

    return {
      time,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000) + 100000,
    }
  })
}

export const generateMockOrder = (overrides: any = {}) => ({
  id: 'order_123',
  symbol: 'AAPL',
  side: 'buy' as const,
  quantity: 100,
  type: 'market' as const,
  status: 'pending' as const,
  timeInForce: 'day' as const,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
})

export const generateMockPosition = (overrides: any = {}) => ({
  id: 'pos_123',
  symbol: 'AAPL',
  quantity: 100,
  averagePrice: 148.5,
  marketValue: 15000.0,
  unrealizedPnL: 152.0,
  realizedPnL: 0,
  side: 'long' as const,
  openedAt: Date.now() - 86400000, // 1 day ago
  updatedAt: Date.now(),
  ...overrides,
})

export const generateMockTradingSimulation = (overrides: any = {}) => ({
  id: 'sim_123',
  name: 'Test Simulation',
  description: 'Test trading simulation',
  portfolio: {
    id: 'portfolio_123',
    name: 'Test Portfolio',
    initialBalance: 100000,
    currentBalance: 102000,
    totalPnL: 2000,
    unrealizedPnL: 500,
    realizedPnL: 1500,
    positions: [],
    orders: [],
    executions: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  settings: {
    initialBalance: 100000,
    commissionPerTrade: 0.99,
    commissionPercentage: 0.0005,
    slippagePercentage: 0.001,
    allowShortSelling: true,
    allowMarginTrading: false,
    marginRequirement: 0.5,
    maxPositionsPerSymbol: 1,
    riskLimits: {
      maxPositionSize: 20000,
      maxDailyLoss: 5000,
      maxTotalLoss: 25000,
    },
    dataSource: 'live' as const,
    simulationSpeed: 1,
  },
  status: 'active' as const,
  startDate: Date.now() - 86400000, // 1 day ago
  createdAt: Date.now() - 86400000,
  updatedAt: Date.now(),
  ...overrides,
})

// Mock WebSocket utilities
export const createMockWebSocket = () => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  isConnected: true,
  quotes: {
    AAPL: generateMockQuote('AAPL'),
    GOOGL: generateMockQuote('GOOGL'),
    MSFT: generateMockQuote('MSFT'),
  },
})

// Mock API responses
export const mockApiResponses = {
  searchSymbols: (query: string) =>
    [
      generateMockSymbol({ symbol: 'AAPL' }),
      generateMockSymbol({ symbol: 'GOOGL', description: 'Alphabet Inc.' }),
      generateMockSymbol({ symbol: 'MSFT', description: 'Microsoft Corporation' }),
    ].filter(symbol => symbol.symbol.includes(query.toUpperCase())),

  getCandleData: (_symbol: string, _timeframe: string) => generateMockCandleData(),

  getQuote: (symbol: string) => generateMockQuote(symbol),
}

// Wait for async operations in tests
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// Custom matchers (optional)
expect.extend({
  toBeValidPrice(received: any) {
    const pass = typeof received === 'number' && received > 0 && !isNaN(received)
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid price`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid price`,
        pass: false,
      }
    }
  },
})

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }
