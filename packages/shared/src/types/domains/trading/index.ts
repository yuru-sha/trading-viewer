// Trading-related types
export type OrderType =
  | 'market'
  | 'limit'
  | 'stop'
  | 'stop_limit'
  | 'trailing_stop'
  | 'bracket'
  | 'oco' // One Cancels Other
  | 'iceberg'

export type OrderSide = 'buy' | 'sell'
export type OrderStatus = 'pending' | 'partial' | 'filled' | 'cancelled' | 'rejected' | 'expired'
export type TimeInForce = 'day' | 'gtc' | 'ioc' | 'fok' // Good Till Cancelled, Immediate Or Cancel, Fill Or Kill

export interface BaseOrder {
  id: string
  symbol: string
  side: OrderSide
  quantity: number
  type: OrderType
  status: OrderStatus
  timeInForce: TimeInForce
  createdAt: number
  updatedAt: number
  expiresAt?: number
  userId?: string
  simulationId?: string
}

export interface MarketOrder extends BaseOrder {
  type: 'market'
}

export interface LimitOrder extends BaseOrder {
  type: 'limit'
  price: number
}

export interface StopOrder extends BaseOrder {
  type: 'stop'
  stopPrice: number
}

export interface StopLimitOrder extends BaseOrder {
  type: 'stop_limit'
  stopPrice: number
  limitPrice: number
}

export interface TrailingStopOrder extends BaseOrder {
  type: 'trailing_stop'
  trailAmount: number
  trailPercent?: number
  highWaterMark?: number // For sell orders
  lowWaterMark?: number // For buy orders
}

export interface BracketOrder extends BaseOrder {
  type: 'bracket'
  price: number
  takeProfitPrice?: number
  stopLossPrice?: number
  childOrders: string[] // IDs of child orders
  parentOrderId?: string
}

export interface OCOOrder extends BaseOrder {
  type: 'oco'
  orders: [LimitOrder | StopOrder, LimitOrder | StopOrder]
  filledOrderId?: string
}

export interface IcebergOrder extends BaseOrder {
  type: 'iceberg'
  price: number
  displayQuantity: number
  remainingQuantity: number
}

export type Order =
  | MarketOrder
  | LimitOrder
  | StopOrder
  | StopLimitOrder
  | TrailingStopOrder
  | BracketOrder
  | OCOOrder
  | IcebergOrder

export interface OrderExecution {
  id: string
  orderId: string
  symbol: string
  side: OrderSide
  quantity: number
  price: number
  timestamp: number
  commission: number
  fees: number
  simulationId?: string
}

export interface Position {
  id: string
  symbol: string
  quantity: number
  averagePrice: number
  marketValue: number
  unrealizedPnL: number
  realizedPnL: number
  side: 'long' | 'short'
  openedAt: number
  updatedAt: number
  simulationId?: string
}

export interface Portfolio {
  id: string
  name: string
  initialBalance: number
  currentBalance: number
  totalPnL: number
  unrealizedPnL: number
  realizedPnL: number
  positions: Position[]
  orders: Order[]
  executions: OrderExecution[]
  createdAt: number
  updatedAt: number
}

export interface TradingSimulation {
  id: string
  name: string
  description?: string
  portfolio: Portfolio
  settings: SimulationSettings
  status: 'active' | 'paused' | 'completed'
  startDate: number
  endDate?: number
  createdAt: number
  updatedAt: number
}

export interface SimulationSettings {
  initialBalance: number
  commissionPerTrade: number
  commissionPercentage: number
  slippagePercentage: number
  allowShortSelling: boolean
  allowMarginTrading: boolean
  marginRequirement: number
  maxPositionsPerSymbol: number
  riskLimits: {
    maxPositionSize: number
    maxDailyLoss: number
    maxTotalLoss: number
  }
  dataSource: 'live' | 'historical'
  simulationSpeed: number // Multiplier for historical data playback
}

// Order validation and execution
export interface OrderValidationResult {
  isValid: boolean
  errors: Array<{
    field: string
    message: string
  }>
  warnings: Array<{
    field: string
    message: string
  }>
}

export interface OrderExecutionResult {
  success: boolean
  orderId: string
  executionId?: string
  message: string
  remainingQuantity: number
  executedQuantity: number
  executedPrice?: number
}

// Trading strategy interface
export interface TradingStrategy {
  id: string
  name: string
  description?: string
  rules: StrategyRule[]
  parameters: Record<string, any>
  isActive: boolean
  simulationIds: string[]
  performance: StrategyPerformance
  createdAt: number
  updatedAt: number
}

export interface StrategyRule {
  id: string
  name: string
  condition: StrategyCondition
  action: StrategyAction
  priority: number
  isEnabled: boolean
}

export interface StrategyCondition {
  type: 'price' | 'indicator' | 'time' | 'position' | 'balance'
  operator: '>' | '<' | '==' | '>=' | '<=' | '!='
  value: number | string
  indicator?: {
    type: 'sma' | 'ema' | 'rsi' | 'macd' | 'bb'
    period: number
    parameters?: Record<string, any>
  }
}

export interface StrategyAction {
  type: 'buy' | 'sell' | 'close' | 'alert'
  orderType: OrderType
  quantity: number | 'all' | 'percent'
  price?: number
  stopLoss?: number
  takeProfit?: number
}

export interface StrategyPerformance {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  averageWin: number
  averageLoss: number
  profitFactor: number
  maxDrawdown: number
  sharpeRatio: number
  totalReturn: number
  annualizedReturn: number
}

// Risk management
export interface RiskMetrics {
  portfolioValue: number
  exposure: number
  leverage: number
  marginUsed: number
  marginAvailable: number
  dailyPnL: number
  unrealizedPnL: number
  var95: number // Value at Risk 95%
  maxDrawdown: number
  sharpeRatio: number
}

export interface RiskLimit {
  id: string
  name: string
  type: 'position_size' | 'portfolio_exposure' | 'daily_loss' | 'var'
  value: number
  unit: 'absolute' | 'percentage'
  isActive: boolean
  action: 'alert' | 'block' | 'force_close'
}

// Market data and analysis
export interface MarketDepth {
  symbol: string
  bids: Array<{ price: number; quantity: number }>
  asks: Array<{ price: number; quantity: number }>
  timestamp: number
}

export interface TradingQuote {
  symbol: string
  bid: number
  ask: number
  last: number
  volume: number
  change: number
  changePercent: number
  timestamp: number
}

export interface OptionChain {
  symbol: string
  expiration: number
  strikes: OptionStrike[]
}

export interface OptionStrike {
  strike: number
  call: {
    symbol: string
    bid: number
    ask: number
    volume: number
    openInterest: number
    impliedVolatility: number
    delta: number
    gamma: number
    theta: number
    vega: number
  }
  put: {
    symbol: string
    bid: number
    ask: number
    volume: number
    openInterest: number
    impliedVolatility: number
    delta: number
    gamma: number
    theta: number
    vega: number
  }
}

// Action types for trading state management
export type TradingAction =
  | { type: 'CREATE_ORDER'; payload: Omit<Order, 'id' | 'status' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_ORDER'; payload: { id: string; updates: Partial<Order> } }
  | { type: 'CANCEL_ORDER'; payload: string }
  | { type: 'EXECUTE_ORDER'; payload: { orderId: string; execution: Omit<OrderExecution, 'id'> } }
  | { type: 'UPDATE_POSITION'; payload: { symbol: string; updates: Partial<Position> } }
  | { type: 'CLOSE_POSITION'; payload: string }
  | { type: 'UPDATE_PORTFOLIO'; payload: Partial<Portfolio> }
  | { type: 'LOAD_SIMULATION'; payload: TradingSimulation }
  | { type: 'START_SIMULATION'; payload: string }
  | { type: 'PAUSE_SIMULATION'; payload: string }
  | { type: 'RESET_SIMULATION'; payload: string }

export interface TradingState {
  simulations: Record<string, TradingSimulation>
  activeSimulationId: string | null
  orders: Order[]
  executions: OrderExecution[]
  positions: Position[]
  quotes: Record<string, TradingQuote>
  isConnected: boolean
  isSimulationMode: boolean
}

// Order templates and presets
export const ORDER_TEMPLATES: Record<OrderType, Partial<Order>> = {
  market: {
    type: 'market',
    timeInForce: 'day',
  },
  limit: {
    type: 'limit',
    timeInForce: 'gtc',
  },
  stop: {
    type: 'stop',
    timeInForce: 'gtc',
  },
  stop_limit: {
    type: 'stop_limit',
    timeInForce: 'gtc',
  },
  trailing_stop: {
    type: 'trailing_stop',
    timeInForce: 'gtc',
    trailAmount: 0.05, // 5 cents default
  },
  bracket: {
    type: 'bracket',
    timeInForce: 'gtc',
    childOrders: [],
  },
  oco: {
    type: 'oco',
    timeInForce: 'gtc',
  },
  iceberg: {
    type: 'iceberg',
    timeInForce: 'gtc',
    displayQuantity: 100,
  },
}

// Utility functions
export const validateOrder = (order: Partial<Order>): OrderValidationResult => {
  const errors: Array<{ field: string; message: string }> = []
  const warnings: Array<{ field: string; message: string }> = []

  if (!order.symbol || order.symbol.trim().length === 0) {
    errors.push({ field: 'symbol', message: 'Symbol is required' })
  }

  if (!order.side) {
    errors.push({ field: 'side', message: 'Order side is required' })
  }

  if (!order.quantity || order.quantity <= 0) {
    errors.push({ field: 'quantity', message: 'Quantity must be greater than 0' })
  }

  if (!order.type) {
    errors.push({ field: 'type', message: 'Order type is required' })
  }

  // Type-specific validations
  if (order.type === 'limit' && !(order as LimitOrder).price) {
    errors.push({ field: 'price', message: 'Limit price is required for limit orders' })
  }

  if (order.type === 'stop' && !(order as StopOrder).stopPrice) {
    errors.push({ field: 'stopPrice', message: 'Stop price is required for stop orders' })
  }

  if (order.type === 'stop_limit') {
    const stopLimitOrder = order as StopLimitOrder
    if (!stopLimitOrder.stopPrice) {
      errors.push({ field: 'stopPrice', message: 'Stop price is required for stop limit orders' })
    }
    if (!stopLimitOrder.limitPrice) {
      errors.push({ field: 'limitPrice', message: 'Limit price is required for stop limit orders' })
    }
  }

  if (order.type === 'trailing_stop') {
    const trailingOrder = order as TrailingStopOrder
    if (!trailingOrder.trailAmount && !trailingOrder.trailPercent) {
      errors.push({ field: 'trailAmount', message: 'Trail amount or trail percent is required' })
    }
  }

  // Warnings
  if (order.timeInForce === 'ioc' && order.type !== 'market') {
    warnings.push({ field: 'timeInForce', message: 'IOC orders work best with market orders' })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}
