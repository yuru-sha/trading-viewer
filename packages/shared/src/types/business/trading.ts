// Trading business logic types

// Order types
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit'
export type OrderSide = 'buy' | 'sell'
export type OrderStatus = 'pending' | 'filled' | 'partial' | 'cancelled' | 'rejected'
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'DAY'

export interface Order {
  id: string
  userId: string
  symbol: string
  side: OrderSide
  type: OrderType
  quantity: number
  price?: number
  stopPrice?: number
  timeInForce: TimeInForce
  status: OrderStatus
  filledQuantity: number
  remainingQuantity: number
  averagePrice?: number
  commission?: number
  simulationId?: string
  createdAt: number
  updatedAt: number
  expiresAt?: number
}

export interface OrderRequest {
  symbol: string
  side: OrderSide
  type: OrderType
  quantity: number
  price?: number
  stopPrice?: number
  timeInForce?: TimeInForce
  clientOrderId?: string
}

// Portfolio types
export interface Position {
  id: string
  userId: string
  symbol: string
  quantity: number
  averagePrice: number
  marketValue: number
  unrealizedPnL: number
  realizedPnL: number
  side: 'long' | 'short'
  openedAt: number
  updatedAt: number
}

export interface Portfolio {
  id: string
  userId: string
  totalValue: number
  cashBalance: number
  marginUsed: number
  marginAvailable: number
  dayPnL: number
  totalPnL: number
  positions: Position[]
  orders: Order[]
  updatedAt: number
}

// Trading account types
export interface TradingAccount {
  id: string
  userId: string
  accountType: 'paper' | 'live'
  status: 'active' | 'suspended' | 'closed'
  balance: number
  equity: number
  marginPower: number
  dayTradingPower: number
  portfolio: Portfolio
  settings: {
    maxOrderSize: number
    maxPositionSize: number
    riskLevel: 'conservative' | 'moderate' | 'aggressive'
    autoStopLoss: boolean
    autoTakeProfit: boolean
  }
  createdAt: number
  updatedAt: number
}

// Risk management types
export interface RiskParameters {
  maxDrawdown: number
  maxLossPerTrade: number
  maxLossPerDay: number
  maxPositionSize: number
  marginRequirement: number
  stopLossRequired: boolean
  takeProfitRequired: boolean
}

export interface RiskAlert {
  id: string
  type: 'margin_call' | 'day_loss_limit' | 'position_limit' | 'drawdown_limit'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  triggeredAt: number
  resolved: boolean
  resolvedAt?: number
}

// Trading simulation types
export interface SimulationConfig {
  startingBalance: number
  commission: number
  slippage: number
  marginRequirement: number
  allowShortSelling: boolean
  startDate: number
  endDate?: number
}

export interface SimulationResult {
  id: string
  userId: string
  config: SimulationConfig
  totalReturn: number
  totalReturnPercent: number
  sharpeRatio: number
  maxDrawdown: number
  winRate: number
  profitFactor: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  averageWin: number
  averageLoss: number
  largestWin: number
  largestLoss: number
  trades: Order[]
  equityCurve: Array<{
    date: number
    equity: number
    drawdown: number
  }>
  createdAt: number
}

// Additional types for trading components
export interface TradingSimulation {
  id: string
  name: string
  config: SimulationConfig
  result?: SimulationResult
  status: 'running' | 'completed' | 'failed'
  createdAt: number
  updatedAt: number
}

export interface TradingQuote {
  symbol: string
  bid: number
  ask: number
  last: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  open: number
  timestamp: number
}
